import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService, AlertDispatchPayload } from '../../notifications/notification.service';
import { PuppeteerService } from './puppeteer.service';
import { FlaresolverrService } from './flaresolverr.service';
import { TenderStage, TenderCategory, ScraperStatus, NotificationChannel } from '@prisma/client';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const execFileAsync = promisify(execFile);
const FLARE_CONTAINER = process.env.FLARESOLVERR_CONTAINER || 'flaresolverr';

interface LpseSource {
  name: string;
  baseUrl: string;
  slug: string;
  apiSlug: string;
  location: string;
  lastScraped?: Date | null;
  priority: number;
}

const STAGE_MAP: Record<string, TenderStage> = {
  'pengumuman': TenderStage.PENGUMUMAN,
  'kualifikasi': TenderStage.KUALIFIKASI,
  'masuk penawaran': TenderStage.PROPOSAL_SUBMISSION,
  'evaluasi': TenderStage.EVALUASI,
  'negosiasi': TenderStage.NEGOSIASI,
  'selesai': TenderStage.SELESAI,
  'batal': TenderStage.BATAL,
  'dihapus': TenderStage.BATAL,
};

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private isScraping = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly puppeteerService: PuppeteerService,
    private readonly flaresolverrService: FlaresolverrService,
    @Optional() @InjectQueue('scraping') private readonly scrapingQueue?: Queue,
    @Optional() @InjectQueue('notifications') private readonly notificationsQueue?: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCronPriority1() {
    this.logger.log('Starting scheduled scraping for priority 1 LPSE...');
    await this.scrapeAll(1);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCronPriority2() {
    this.logger.log('Starting scheduled scraping for priority 2 LPSE...');
    await this.scrapeAll(2);
  }

  @Cron(CronExpression.EVERY_2ND_HOUR)
  async handleCronPriority3() {
    this.logger.log('Starting scheduled scraping for priority 3 LPSE...');
    await this.scrapeAll(3);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkCrawlerHealthCron() {
    try {
      const sources = await this.prisma.lpseSource.findMany({
        select: { slug: true },
      });
      const slugs = sources.map((s) => s.slug);
      const critical: Array<{ crawlerName: string; uptime: number | null; failedRuns: number }> = [];

      for (const slug of slugs) {
        const logs = await this.prisma.scraperLog.findMany({
          where: { crawlerName: slug },
          orderBy: { startedAt: 'desc' },
          take: 30,
        });
        const totalRuns = logs.length;
        if (totalRuns < 5) continue;
        const successRuns = logs.filter((l) => l.status === ScraperStatus.SUCCESS).length;
        const uptime = (successRuns / totalRuns) * 100;
        if (uptime < 60) {
          critical.push({
            crawlerName: slug,
            uptime: parseFloat(uptime.toFixed(2)),
            failedRuns: totalRuns - successRuns,
          });
        }
      }

      if (critical.length > 0) {
        await this.alertCrawlerFailures(critical);
      }
    } catch (err) {
      this.logger.error(`checkCrawlerHealthCron error: ${err}`);
    }
  }

  async scrapeAll(priority?: number) {
    if (this.scrapingQueue) {
      const job = await this.scrapingQueue.add('scrape-all', { priority });
      this.logger.log(`Scrape job queued as #${job.id}`);
      return 0;
    }

    if (this.isScraping) {
      this.logger.warn('Scrape already in progress. Skipping duplicate execution.');
      return 0;
    }

    this.isScraping = true;
    const batchSize = 2;
    const interBatchDelay = 2000;
    let totalNew = 0;
    try {
      const sources = await this.getActiveSources(priority);
      for (const batch of this.batches(sources, batchSize)) {
        const results = await Promise.allSettled(
          batch.map((source) => this.scrapeSource(source))
        );
        totalNew += results.reduce((sum, r) => {
          if (r.status === 'fulfilled') return sum + r.value;
          return sum;
        }, 0);
        if (interBatchDelay > 0) await sleep(interBatchDelay);
      }

    this.logger.log(`Scrape cycle complete. Total new/updated tenders: ${totalNew}`);

    if (totalNew === 0) {
      this.logger.warn('All sources returned 0 tenders. LPSE sites may be unreachable.');
    }

    return totalNew;
    } finally {
      this.isScraping = false;
    }
  }

  private async getActiveSources(priority?: number): Promise<LpseSource[]> {
    const where: any = { isActive: true };
    if (priority !== undefined) {
      where.priority = priority;
    }
    const dbSources = await this.prisma.lpseSource.findMany({ where });
    return dbSources.map((s) => ({
      name: s.name,
      baseUrl: s.baseUrl,
      slug: s.slug,
      apiSlug: s.apiSlug,
      location: s.location || '',
      lastScraped: s.lastScraped,
      priority: s.priority,
    }));
  }

  async scrapeSourceBySlug(slug: string): Promise<number> {
    const dbSource = await this.prisma.lpseSource.findUnique({ where: { slug } });
    if (!dbSource || !dbSource.isActive) {
      this.logger.warn(`Source ${slug} not found or inactive.`);
      return 0;
    }
    return this.scrapeSource({
      name: dbSource.name,
      baseUrl: dbSource.baseUrl,
      slug: dbSource.slug,
      apiSlug: dbSource.apiSlug,
      location: dbSource.location || '',
      lastScraped: dbSource.lastScraped,
      priority: dbSource.priority,
    });
  }

  private async scrapeSource(source: LpseSource): Promise<number> {
    const startedAt = new Date();
    let status: ScraperStatus = ScraperStatus.SUCCESS;
    let itemsCrawled = 0;
    let errorMessage: string | null = null;
    const newTenders: TenderParseResult[] = [];

    try {
      const tenders = await this.fetchTenders(source);
      itemsCrawled = tenders.length;

      if (tenders.length === 0) {
        return 0;
      }

      let upserted = 0;
      for (const tender of tenders) {
        try {
          const existing = await this.prisma.tender.findUnique({ where: { lpseId: tender.lpseId } });
          await this.prisma.tender.upsert({
            where: { lpseId: tender.lpseId },
            update: {
              title: tender.title,
              agency: tender.agency,
              pagu: tender.pagu,
              hps: tender.hps,
              category: tender.category,
              stage: tender.stage,
              location: tender.location || source.location,
              publishedAt: tender.publishedAt,
              deadlineAt: tender.deadlineAt,
            },
            create: {
              lpseId: tender.lpseId,
              title: tender.title,
              agency: tender.agency,
              pagu: tender.pagu,
              hps: tender.hps,
              category: tender.category,
              stage: tender.stage,
              location: tender.location || source.location,
              publishedAt: tender.publishedAt,
              deadlineAt: tender.deadlineAt,
            },
          });
          upserted++;
          if (!existing) newTenders.push(tender);
        } catch (err) {
          this.logger.warn(`Failed upsert tender ${tender.lpseId}: ${err instanceof Error ? err.message : err}`);
        }
      }

      // Update lastScraped pada source setelah sukses
      await this.prisma.lpseSource.update({
        where: { slug: source.slug },
        data: { lastScraped: new Date() },
      });

      return upserted;
    } catch (err) {
      status = ScraperStatus.CRITICAL_FAILURE;
      errorMessage = err instanceof Error ? err.message : String(err);
      return 0;
    } finally {
      await this.prisma.scraperLog.create({
        data: { crawlerName: source.slug, status, itemsCrawled, errorMessage, startedAt, endedAt: new Date() },
      });

      // Dispatch notifikasi secara async — tidak blocking scrape cycle
      if (newTenders.length > 0) {
        this.dispatchNotifications(newTenders).catch((err) =>
          this.logger.error(`Async notification dispatch failed: ${err}`)
        );
      }
    }
  }

  private async dispatchNotifications(newTenders: TenderParseResult[]) {
    try {
      const alerts = await this.prisma.keywordAlert.findMany({
        where: { tenantId: { not: '' } },
      });

      for (const tender of newTenders) {
        const lowerTitle = tender.title.toLowerCase();
        const matchingAlerts = alerts.filter((a) => lowerTitle.includes(a.keyword.toLowerCase()));

        for (const alert of matchingAlerts) {
          // Dedup check: skip jika sudah pernah dinotifikasi untuk tender ini
          const alreadyNotified = await this.prisma.notificationLog.findFirst({
            where: {
              alertId: alert.id,
              tenantId: alert.tenantId,
              message: { contains: tender.lpseId },
            },
          });
          if (alreadyNotified) continue;

          const payload = {
            tenantId: alert.tenantId,
            alertId: alert.id,
            tenderTitle: tender.title,
            tenderPagu: tender.pagu.toLocaleString('id-ID'),
            tenderUrl: `https://sinyaltender.id/tenders/${tender.lpseId}`,
            emailRecipient: alert.emailAddress || undefined,
            telegramChatId: alert.telegramChatId || undefined,
          };

          // Log WEB_DASHBOARD notification dulu sebagai dedup reference
          if (alert.channels.includes(NotificationChannel.WEB_DASHBOARD)) {
            await this.prisma.notificationLog.create({
              data: {
                alertId: alert.id,
                tenantId: alert.tenantId,
                channel: NotificationChannel.WEB_DASHBOARD,
                recipient: alert.tenantId,
                message: `Tender baru: ${tender.title} (Rp ${tender.pagu.toLocaleString('id-ID')}) [${tender.lpseId}]`,
                deliveryStatus: 'SENT',
              },
            });
          }

          if (alert.channels.includes(NotificationChannel.EMAIL) && alert.emailAddress) {
            await this.dispatchToQueueOrSend('email', payload);
          }

          if (alert.channels.includes(NotificationChannel.TELEGRAM)) {
            if (alert.telegramChatId) {
              await this.dispatchToQueueOrSend('telegram', payload);
            } else if (alert.emailAddress) {
              this.logger.log(`Telegram not connected — falling back to EMAIL for ${alert.emailAddress}`);
              await this.dispatchToQueueOrSend('email', { ...payload, emailRecipient: alert.emailAddress });
            }
          }
        }
      }
    } catch (err) {
      this.logger.error(`Notification dispatch error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async alertCrawlerFailures(criticalCrawlers: Array<{ crawlerName: string; uptime: number | null; failedRuns: number }>) {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          tenantMembers: {
            some: { role: 'SUPERADMIN' },
          },
        },
      });

      if (admins.length === 0) return;

      const subject = '[SinyalTender] Peringatan: Crawler Scraper Mengalami Gangguan';
      const message = criticalCrawlers.map((c) =>
        `- ${c.crawlerName}: uptime ${c.uptime}% (${c.failedRuns} gagal dari 30 run terakhir)`
      ).join('\n');
      const emailText = `Halo Admin,\n\nBeberapa crawler scraper mengalami gangguan:\n\n${message}\n\nSilakan cek dashboard scraper monitor untuk detail lebih lanjut.\n\nSalam,\nSinyalTender System`;

      for (const admin of admins) {
        if (!admin.email) continue;
        try {
          const resendKey = process.env.RESEND_API_KEY;
          const mailFrom = process.env.MAIL_FROM || 'no-reply@sinyaltender.id';
          if (resendKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: mailFrom,
                to: admin.email,
                subject,
                text: emailText,
              }),
            });
          } else {
            this.logger.warn(`[DEV] Failure alert for ${admin.email}:\n${emailText}`);
          }
        } catch (err) {
          this.logger.warn(`Failed to send failure alert to ${admin.email}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`alertCrawlerFailures error: ${err}`);
    }
  }

  private async dispatchToQueueOrSend(type: 'email' | 'telegram', payload: AlertDispatchPayload) {
    if (this.notificationsQueue) {
      await this.notificationsQueue.add('dispatch', { type, payload });
    } else {
      if (type === 'email') {
        await this.notificationService.sendEmailAlert(payload).catch((err) =>
          this.logger.warn(`Email notification failed: ${err.message}`)
        );
      } else {
        await this.notificationService.sendTelegramAlert(payload).catch((err) =>
          this.logger.warn(`Telegram notification failed: ${err.message}`)
        );
      }
    }
  }

  private async fetchTenders(source: LpseSource): Promise<TenderParseResult[]> {
    const pageUrl = `${source.baseUrl}/lelang`;
    // SPSE uses next year's budget (tahun) for active tenders
    const year = new Date().getFullYear() + 1;

    // 1. Try Python helper inside FlareSolverr container (bypasses Cloudflare via UC + Xvfb)
    const pyTenders = await this.fetchTendersViaPythonScript(pageUrl, source, year);
    if (pyTenders.length > 0) {
      this.logger.log(`[${source.slug}] Got ${pyTenders.length} tenders via Python helper`);
      return pyTenders;
    }

    // 2. Fall back to FlareSolverr HTTP + HTML parse
    let fsSession = '';
    try {
      this.logger.log(`[${source.slug}] Fetching tenders via Flaresolverr @ ${pageUrl}`);

      const fsResult = await this.flaresolverrService.fetchSession(pageUrl);
      fsSession = fsResult.session;
      const html = fsResult.html;
      const cookies = fsResult.cookies;
      const userAgent = fsResult.userAgent;

      const token = this.extractToken(html);

      if (token) {
        this.logger.log(`[${source.slug}] Token found, attempting DataTable AJAX POST...`);
        const apiTenders = await this.fetchTendersViaDataTable(source, token, cookies, userAgent, year, fsSession);
        if (apiTenders.length > 0) {
          this.logger.log(`[${source.slug}] Got ${apiTenders.length} tenders via DataTable AJAX`);
          return apiTenders;
        }
        this.logger.log(`[${source.slug}] DataTable AJAX returned 0 tenders, falling back to HTML parse`);
      } else {
        this.logger.log(`[${source.slug}] No token found, using HTML parse only`);
      }

      const rows = this.parseHtmlTableRows(html);
      this.logger.log(`[${source.slug}] Parsed ${rows.length} rows from Flaresolverr HTML`);

      if (rows.length >= 25) {
        this.logger.warn(`[${source.slug}] Got ${rows.length} rows (may be truncated by server-side rendering limit)`);
      }

      const allTenders = rows.map((row) => this.parseApiRow(row, source));

      if (allTenders.length === 0) {
        this.logger.warn(`[${source.slug}] No tenders found via Flaresolverr scrape`);
      }

      return allTenders;
    } catch (err: any) {
      this.logger.error(`[${source.slug}] fetchTenders failed: ${err.message}`);
      return [];
    } finally {
      if (fsSession) {
        this.flaresolverrService.destroySession(fsSession).catch(() => {});
      }
    }
  }

  private async fetchTendersViaPythonScript(
    pageUrl: string,
    source: LpseSource,
    year: number,
  ): Promise<TenderParseResult[]> {
    try {
      this.logger.debug(`[${source.slug}] Trying Python helper in container "${FLARE_CONTAINER}"...`);
      const maxWait = process.env.PYTHON_SCRAPER_TIMEOUT || '60';
      const { stdout, stderr } = await execFileAsync('docker', [
        'exec', FLARE_CONTAINER,
        'python3', '/app/flare_scraper.py',
        pageUrl, String(year), maxWait, source.slug,
      ], { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 });

      if (stderr) {
        this.logger.debug(`[${source.slug}] Python stderr: ${stderr.slice(0, 500)}`);
      }

      const trimmed = stdout.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        this.logger.debug(`[${source.slug}] Python helper returned non-JSON (${trimmed.length} bytes)`);
        return [];
      }

      const result = JSON.parse(trimmed);

      if (result.error) {
        this.logger.debug(`[${source.slug}] Python helper error: ${result.error}`);
        return [];
      }

      const data: any[] = result.data || [];
      this.logger.log(`[${source.slug}] Python helper returned ${data.length} raw rows (source=${result.source})`);

      return data.map((row: any) => {
        if (Array.isArray(row)) {
          return this.parseApiRow(row, source);
        }
        return this.parseApiRow(
          [
            row.id || row.paket_id || '',
            row.name || row.paket_nama || row.title || '',
            row.instansi || row.agency || source.name,
            row.status || '',
            row.pagu || '0',
            row.hps || '0',
            row.versi_spse || '',
            row.kategori || '',
          ],
          source,
        );
      });
    } catch (err: any) {
      this.logger.debug(`[${source.slug}] Python helper failed: ${err.message?.slice(0, 200)}`);
      return [];
    }
  }

  private async fetchTendersViaDataTable(
    source: LpseSource,
    token: string,
    cookies: string[],
    userAgent: string,
    year: number,
    fsSession: string,
  ): Promise<TenderParseResult[]> {
    const allTenders: TenderParseResult[] = [];
    const apiSlug = source.apiSlug;
    const apiUrl = `${source.baseUrl}/dt/lelang?tahun=${year}`;
    const cookieStr = cookies.join('; ');
    const pageSize = 200;
    let start = 0;
    let draw = 1;
    let totalRecords = 0;
    let maxPages = 50;

    for (let page = 0; page < maxPages; page++) {
      try {
        const formData = new URLSearchParams();
        formData.append('authenticityToken', token);
        formData.append('draw', String(draw));
        formData.append('start', String(start));
        formData.append('length', String(pageSize));
        for (let c = 0; c < 8; c++) {
          formData.append(`columns[${c}][data]`, String(c));
          formData.append(`columns[${c}][name]`, '');
          formData.append(`columns[${c}][searchable]`, 'true');
          formData.append(`columns[${c}][orderable]`, 'true');
          formData.append(`columns[${c}][search][value]`, '');
          formData.append(`columns[${c}][search][regex]`, 'false');
        }
        formData.append('order[0][column]', '0');
        formData.append('order[0][dir]', 'asc');
        formData.append('search[value]', '');
        formData.append('search[regex]', 'false');

        const result = await this.flaresolverrService.postWithSession(
          apiUrl,
          Object.fromEntries(formData.entries()),
          fsSession,
        );

        const body = result.html;
        const parsed = this.parseDataTableResponse(body);

        if (!parsed) {
          this.logger.log(`[${source.slug}] DataTable page ${page + 1}: non-JSON response (${body.length} bytes), stopping`);
          break;
        }

        if (parsed.error) {
          this.logger.warn(`[${source.slug}] DataTable page ${page + 1} error: ${parsed.error}`);
          break;
        }

        totalRecords = parsed.recordsTotal;
        const rows = parsed.data;
        this.logger.log(`[${source.slug}] DataTable page ${page + 1}: ${rows.length} rows (total: ${totalRecords})`);

        if (rows.length === 0) break;

        for (const row of rows) {
          allTenders.push(this.parseApiRow(row, source));
        }

        start += pageSize;
        draw++;
        if (start >= totalRecords) break;

        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        this.logger.error(`[${source.slug}] DataTable page ${page + 1} failed: ${err.message}`);
        break;
      }
    }

    if (totalRecords > 0) {
      this.logger.log(`[${source.slug}] DataTable complete: ${allTenders.length} tenders of ${totalRecords} total`);
    }

    return allTenders;
  }

  private parseDataTableResponse(body: string): { recordsTotal: number; data: any[][]; error?: string } | null {
    const trimmed = body.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.error) {
        return { recordsTotal: 0, data: [], error: parsed.error };
      }
      if (typeof parsed.recordsTotal !== 'number' || !Array.isArray(parsed.data)) {
        return null;
      }
      return {
        recordsTotal: parsed.recordsTotal,
        data: parsed.data,
      };
    } catch {
      return null;
    }
  }

  private async fetchSession(source: LpseSource): Promise<{ token: string; cookies: string; userAgent: string }> {
    const pageUrl = `${source.baseUrl}/lelang`;
    try {
      const res = await axios.get(pageUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        maxRedirects: 5,
      });

      if (res.status === 200) {
        const token = this.extractToken(res.data);
        const cookies = (res.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');
        if (token) {
          return { token, cookies, userAgent: '' };
        }
      }
    } catch (err) {
      this.logger.warn(`[${source.slug}] axios fetchSession failed (${(err as any)?.response?.status || (err as any)?.message})`);
    }

    let html: string;
    let cookieList: string[];
    let userAgent = '';
    let fsSession = '';
    try {
      this.logger.log(`[${source.slug}] Trying Flaresolverr...`);
      const result = await this.flaresolverrService.fetchSession(pageUrl);
      fsSession = result.session;
      html = result.html;
      cookieList = result.cookies;
      userAgent = result.userAgent;
    } catch (fsErr) {
      this.logger.warn(`[${source.slug}] Flaresolverr failed (${(fsErr as Error).message}), trying puppeteer...`);
      const result = await this.puppeteerService.fetchSession(pageUrl);
      html = result.html;
      cookieList = result.cookies;
    } finally {
      if (fsSession) {
        this.flaresolverrService.destroySession(fsSession).catch(() => {});
      }
    }
    const token = this.extractToken(html);
    const cookies = cookieList.join('; ');
    if (!token) {
      this.logger.warn(`[${source.slug}] Could not get authenticityToken from any method`);
    }
    return { token, cookies, userAgent };
  }

  private parseHtmlTableRows(html: string): any[][] {
    const rows: any[][] = [];
    const tableMatch = html.match(/<table[^>]*id=["']tbllelang["'][^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) return rows;

    const tbodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return rows;

    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(tbodyMatch[1])) !== null) {
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        cells.push(tdMatch[1].trim());
      }
      if (cells.length >= 5) {
        rows.push([
          this.stripHtml(cells[0]), // 0: ID
          cells[1],                 // 1: Title (keep HTML for badges)
          this.stripHtml(cells[2]), // 2: Agency
          this.stripHtml(cells[3]), // 3: Status
          this.stripHtml(cells[4]), // 4: Pagu
          this.stripHtml(cells[5] || '0'), // 5: HPS (may be empty in HTML)
          this.stripHtml(cells[8] || ''),  // 6: SPSE version
          this.stripHtml(cells[11] || ''), // 7: Category text from table
        ]);
      }
    }
    return rows;
  }

  private stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, '').trim();
  }

  private extractToken(html: string): string {
    const jsMatch = html.match(/authenticityToken\s*=\s*['"](\S+?)['"]/);
    if (jsMatch) return jsMatch[1];
    const metaMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["'](\S+?)["']/i);
    if (metaMatch) return metaMatch[1];
    const inputMatch = html.match(/<input[^>]+name=["']authenticityToken["'][^>]+value=["'](\S+?)["']/i);
    if (inputMatch) return inputMatch[1];
    return '';
  }

  private parseApiRow(row: any[], source: LpseSource): TenderParseResult {
    const lpseId = `${source.slug}_${row[0] || ''}`;
    const rawTitle = (row[1] || '').replace(/<[^>]+>/g, '').trim();
    const agency = (row[2] || source.name).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const paguText = (row[4] || '0').replace(/\s+/g, ' ').trim();
    const hpsText = (row[5] || '0').replace(/\s+/g, ' ').trim();
    const statusText = (row[3] || '').toLowerCase();
    const categoryText = (row[7] || '').toLowerCase();

    let category = this.inferCategory(rawTitle);
    if (category === TenderCategory.OTHER && categoryText) {
      category = this.inferCategory(categoryText);
    }

    return {
      lpseId,
      title: rawTitle.replace(/\s+/g, ' ').trim(),
      agency,
      pagu: this.parseFormattedPagu(paguText),
      hps: this.parseFormattedPagu(hpsText),
      category,
      stage: this.mapStage(statusText),
      location: source.location,
      publishedAt: new Date(),
      deadlineAt: null,
    };
  }

  private parseFormattedPagu(text: string): number {
    if (!text || text === '0') return 0;

    // Format examples: "12,9 M", "485,4 M", "1,2 T", "500 Juta"
    const lower = text.toLowerCase();
    let multiplier = 1;

    if (lower.includes('t')) {
      multiplier = 1_000_000_000_000; // Triliun
    } else if (lower.includes('m')) {
      multiplier = 1_000_000_000; // Miliar
    } else if (lower.includes('juta') || lower.includes('jt')) {
      multiplier = 1_000_000;
    } else if (lower.includes('ribu')) {
      multiplier = 1_000;
    }

    const numStr = text.replace(/[^0-9,]/g, '').replace(',', '.');
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : Math.round(num * multiplier);
  }

  private parseDecimal(value: string): number {
    if (!value) return 0;
    const num = parseFloat(value.replace(/\./g, '').replace(/,/g, '.'));
    return isNaN(num) ? 0 : num;
  }

  private inferCategory(title: string): TenderCategory {
    const lower = title.toLowerCase();
    if (lower.includes('software') || lower.includes('sistem') || lower.includes('teknologi') || lower.includes('komputer') || lower.includes('aplikasi') || lower.includes('digital') || lower.includes('platform') || lower.includes('siber') || lower.includes('internet')) return TenderCategory.IT_SERVICES;
    if (lower.includes('konstruksi') || lower.includes('bangunan') || lower.includes('jalan') || lower.includes('gedung') || lower.includes('pembangunan') || lower.includes('jembatan') || lower.includes('irigasi') || lower.includes('rumah sakit') || lower.includes('puskesmas')) return TenderCategory.CONSTRUCTION;
    if (lower.includes('pengadaan') || lower.includes('barang') || lower.includes('alat') || lower.includes('peralatan') || lower.includes('material') || lower.includes('kendaraan') || lower.includes('laptop') || lower.includes('obat')) return TenderCategory.GOODS_PROCUREMENT;
    if (lower.includes('konsultan') || lower.includes('konsultansi') || lower.includes('studi') || lower.includes('kajian') || lower.includes('perencanaan') || lower.includes('pengawasan') || lower.includes('amdal')) return TenderCategory.CONSULTING;
    if (lower.includes('pemeliharaan') || lower.includes('maintenance') || lower.includes('perawatan') || lower.includes('service') || lower.includes('dukungan') || lower.includes('duktek')) return TenderCategory.MAINTENANCE_SERVICES;
    return TenderCategory.OTHER;
  }

  private mapStage(text: string): TenderStage {
    if (!text) return TenderStage.PENGUMUMAN;
    for (const [key, stage] of Object.entries(STAGE_MAP)) {
      if (text.includes(key)) return stage;
    }
    return TenderStage.PENGUMUMAN;
  }

  private *batches<T>(items: T[], size: number): Generator<T[]> {
    for (let i = 0; i < items.length; i += size) {
      yield items.slice(i, i + size);
    }
  }
}

interface TenderParseResult {
  lpseId: string;
  title: string;
  agency: string;
  pagu: number;
  hps: number;
  category: TenderCategory;
  stage: TenderStage;
  location: string;
  publishedAt: Date;
  deadlineAt: Date | null;
}
