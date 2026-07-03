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
    let totalNew = 0;
    try {
      const sources = await this.getActiveSources(priority);
      for (const batch of this.batches(sources, 5)) {
        const results = await Promise.allSettled(
          batch.map((source) => this.scrapeSource(source))
        );
        totalNew += results.reduce((sum, r) => {
          if (r.status === 'fulfilled') return sum + r.value;
          return sum;
        }, 0);
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
    try {
      const { token, cookies } = await this.fetchSession(source);
      if (!token) {
        this.logger.warn(`[${source.slug}] Could not get authenticity token`);
        return [];
      }

      const allTenders: TenderParseResult[] = [];
      let start = 0;
      const pageSize = 200;

      while (true) {
        const page = await this.fetchTendersPage(source, token, cookies, start, pageSize);
        if (page.length === 0) break;

        allTenders.push(...page);

        if (page.length < pageSize) break;

        // Incremental: stop jika semua tender di halaman ini sudah ada di DB
        const lpseIds = page.map((t) => t.lpseId);
        const existingCount = await this.prisma.tender.count({
          where: { lpseId: { in: lpseIds } },
        });
        if (existingCount === lpseIds.length) {
          this.logger.log(`[${source.slug}] All ${lpseIds.length} tenders in page already exist. Stopping pagination.`);
          break;
        }

        start += pageSize;
      }

      return allTenders;
    } catch (err: any) {
      this.logger.error(`[${source.slug}] fetchTenders error: ${err.message}`);
      return [];
    }
  }

  private async fetchSession(source: LpseSource): Promise<{ token: string; cookies: string }> {
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
          return { token, cookies };
        }
      }
    } catch (err) {
      this.logger.warn(`[${source.slug}] axios fetchSession failed (${(err as any)?.response?.status || (err as any)?.message}), trying puppeteer...`);
    }

    let html: string;
    let cookieList: string[];
    try {
      this.logger.log(`[${source.slug}] Trying Flaresolverr...`);
      const result = await this.flaresolverrService.fetchSession(pageUrl);
      html = result.html;
      cookieList = result.cookies;
    } catch (fsErr) {
      this.logger.warn(`[${source.slug}] Flaresolverr failed (${(fsErr as Error).message}), trying puppeteer...`);
      const result = await this.puppeteerService.fetchSession(pageUrl);
      html = result.html;
      cookieList = result.cookies;
    }
    const token = this.extractToken(html);
    const cookies = cookieList.join('; ');
    if (!token) {
      this.logger.warn(`[${source.slug}] Could not get authenticityToken from any method`);
    }
    return { token, cookies };
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

  private async fetchTendersPage(
    source: LpseSource,
    token: string,
    cookies: string,
    start: number,
    length = 200,
  ): Promise<TenderParseResult[]> {
    const apiUrl = `${source.baseUrl}/dt/lelang?tahun=${new Date().getFullYear()}`;
    const body = new URLSearchParams({
      authenticityToken: token,
      draw: '1',
      start: String(start),
      length: String(length),
    }).toString();

    const res = await axios.post(apiUrl, body, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookies,
        'Referer': `${source.baseUrl}/lelang`,
      },
    });

    const data = res.data;
    const rawRows: any[][] = data.data || [];
    return rawRows.map((row) => this.parseApiRow(row, source));
  }

  private parseApiRow(row: any[], source: LpseSource): TenderParseResult {
    const lpseId = `${source.slug}_${row[0] || ''}`;
    const rawTitle = (row[1] || '').replace(/<[^>]+>/g, '').trim();
    const agency = (row[2] || source.name).replace(/\s+/g, ' ').trim();
    const paguText = (row[4] || '0').replace(/\s+/g, ' ').trim();
    const hpsText = (row[5] || '0').replace(/\s+/g, ' ').trim();
    const statusText = (row[3] || '').toLowerCase();

    return {
      lpseId,
      title: rawTitle.replace(/\s+/g, ' ').trim(),
      agency,
      pagu: this.parseFormattedPagu(paguText),
      hps: this.parseFormattedPagu(hpsText),
      category: this.inferCategory(rawTitle),
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
