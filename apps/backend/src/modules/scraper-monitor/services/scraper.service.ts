import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { TenderStage, TenderCategory, ScraperStatus, NotificationChannel } from '@prisma/client';
import axios from 'axios';

interface LpseSource {
  name: string;
  baseUrl: string;
  slug: string;
  apiSlug: string;
  location: string;
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

const SEED_TENDERS: Array<{
  title: string; agency: string; pagu: number; hps: number;
  category: TenderCategory; stage: TenderStage; location: string;
}> = [
  { title: 'Pengembangan Sistem Informasi Manajemen Kepegawaian Terintegrasi', agency: 'Kementerian Keuangan RI', pagu: 12500000000, hps: 11875000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Pembangunan Jalan Tol Ruas Cileunyi - Sumedang - Dawuan', agency: 'Kementerian PUPR', pagu: 850000000000, hps: 825000000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.KUALIFIKASI, location: 'Jawa Barat' },
  { title: 'Penyediaan Laptop dan Perangkat IT untuk ASN Tahun 2025', agency: 'Pemprov DKI Jakarta', pagu: 45000000000, hps: 42750000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Jasa Konsultansi Perencanaan Pembangunan Gedung Perkantoran Terpadu', agency: 'Pemprov Jawa Barat', pagu: 7500000000, hps: 7125000000, category: TenderCategory.CONSULTING, stage: TenderStage.PROPOSAL_SUBMISSION, location: 'Jawa Barat' },
  { title: 'Pemeliharaan Jaringan Irigasi Bendungan Seri Wilayah Timur', agency: 'Kementerian PUPR', pagu: 95000000000, hps: 90250000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.EVALUASI, location: 'Jawa Timur' },
  { title: 'Pengadaan Alat Kesehatan Rumah Sakit Kelas B', agency: 'Pemprov DKI Jakarta', pagu: 185000000000, hps: 175750000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Jasa Konsultansi Pengawasan Pembangunan Jalan Lingkar Kota', agency: 'Kementerian PUPR', pagu: 25000000000, hps: 23750000000, category: TenderCategory.CONSULTING, stage: TenderStage.PENGUMUMAN, location: 'Jawa Barat' },
  { title: 'Pengadaan Kendaraan Dinas Operasional Pemerintah Daerah', agency: 'Pemprov Jawa Barat', pagu: 65000000000, hps: 61750000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.KUALIFIKASI, location: 'Jawa Barat' },
  { title: 'Pembangunan Gedung Sekolah SMAN 5 Terpadu', agency: 'Pemprov DKI Jakarta', pagu: 120000000000, hps: 114000000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Sistem Aplikasi Pelayanan Publik Berbasis Digital', agency: 'Pemprov Jawa Timur', pagu: 8500000000, hps: 8075000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.PROPOSAL_SUBMISSION, location: 'Jawa Timur' },
  { title: 'Peningkatan Jalan Poros Provinsi Sepanjang 45 KM', agency: 'Pemprov Jawa Barat', pagu: 275000000000, hps: 261250000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.EVALUASI, location: 'Jawa Barat' },
  { title: 'Pengadaan Peralatan Laboratorium IPA Terpadu', agency: 'Kementerian Pendidikan', pagu: 32500000000, hps: 30875000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Jasa Maintenance Infrastruktur Jaringan Pemerintah Provinsi', agency: 'Pemprov Jawa Timur', pagu: 18000000000, hps: 17100000000, category: TenderCategory.MAINTENANCE_SERVICES, stage: TenderStage.NEGOSIASI, location: 'Jawa Timur' },
  { title: 'Pengembangan Platform E-Learning Terintegrasi AI', agency: 'Kementerian Pendidikan', pagu: 22000000000, hps: 20900000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Pengadaan Sistem Keamanan SIber Pemerintah Daerah', agency: 'Pemprov DKI Jakarta', pagu: 15000000000, hps: 14250000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.KUALIFIKASI, location: 'DKI Jakarta' },
  { title: 'Pembangunan Puskesmas Rawat Inap Kecamatan', agency: 'Pemprov Jawa Barat', pagu: 45000000000, hps: 42750000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.PENGUMUMAN, location: 'Jawa Barat' },
  { title: 'Jasa Konsultansi AMDAL Proyek Pembangunan Bendungan', agency: 'Kementerian PUPR', pagu: 5000000000, hps: 4750000000, category: TenderCategory.CONSULTING, stage: TenderStage.SELESAI, location: 'Jawa Barat' },
  { title: 'Pengadaan Multifunction Printer dan Perangkat Peripheral', agency: 'Kementerian Keuangan RI', pagu: 7500000000, hps: 7125000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Dukungan Teknis dan Pemeliharaan Aplikasi Core Tax', agency: 'Kementerian Keuangan RI', pagu: 95000000000, hps: 90250000000, category: TenderCategory.MAINTENANCE_SERVICES, stage: TenderStage.PROPOSAL_SUBMISSION, location: 'DKI Jakarta' },
  { title: 'Pembangunan Infrastruktur Smart City Tahap III', agency: 'Pemprov DKI Jakarta', pagu: 350000000000, hps: 332500000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Penyediaan Jasa Kebersihan dan Pengelolaan Limbah Perkantoran', agency: 'Pemprov Jawa Barat', pagu: 12000000000, hps: 11400000000, category: TenderCategory.OTHER, stage: TenderStage.KUALIFIKASI, location: 'Jawa Barat' },
  { title: 'Pengadaan Obat dan Vaksin untuk Program Imunisasi Nasional', agency: 'Kementerian Kesehatan', pagu: 87500000000, hps: 83125000000, category: TenderCategory.GOODS_PROCUREMENT, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
  { title: 'Jasa Konsultansi Studi Kelayakan Kereta Cepat', agency: 'Kementerian Perhubungan', pagu: 35000000000, hps: 33250000000, category: TenderCategory.CONSULTING, stage: TenderStage.EVALUASI, location: 'Jawa Barat' },
  { title: 'Pembangunan Rumah Sakit Khusus Kanker Tipe C', agency: 'Kementerian Kesehatan', pagu: 500000000000, hps: 475000000000, category: TenderCategory.CONSTRUCTION, stage: TenderStage.PENGUMUMAN, location: 'Jawa Timur' },
  { title: 'Pengembangan Aplikasi Manajemen Arsip Digital', agency: 'Pemprov DKI Jakarta', pagu: 9500000000, hps: 9025000000, category: TenderCategory.IT_SERVICES, stage: TenderStage.PENGUMUMAN, location: 'DKI Jakarta' },
];

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private isScraping = false;
  private isSeeding = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.log('Starting scheduled LPSE scraping...');
    await this.scrapeAll();
  }

  async scrapeAll() {
    if (this.isScraping) {
      this.logger.warn('Scrape already in progress. Skipping duplicate execution.');
      return 0;
    }

    this.isScraping = true;
    try {
      const sources = await this.getActiveSources();
      const results = await Promise.allSettled(
        sources.map((source) => this.scrapeSource(source))
      );

    const totalNew = results.reduce((sum, r) => {
      if (r.status === 'fulfilled') return sum + r.value;
      return sum;
    }, 0);

    this.logger.log(`Scrape cycle complete. Total new/updated tenders: ${totalNew}`);

    if (totalNew === 0) {
      this.logger.warn('All sources returned 0 tenders. LPSE sites may be unreachable.');
    }

    return totalNew;
    } finally {
      this.isScraping = false;
    }
  }

  private async getActiveSources(): Promise<LpseSource[]> {
    const dbSources = await this.prisma.lpseSource.findMany({
      where: { isActive: true },
    });
    return dbSources.map((s) => ({
      name: s.name,
      baseUrl: s.baseUrl,
      slug: s.slug,
      apiSlug: s.apiSlug,
      location: s.location || '',
    }));
  }

  async seedData(): Promise<number> {
    if (this.isSeeding) {
      this.logger.warn('Seeding already in progress. Skipping duplicate execution.');
      return 0;
    }

    this.isSeeding = true;
    this.logger.log('Seeding sample tender data...');
    const startedAt = new Date();
    let count = 0;

    try {
      for (let i = 0; i < SEED_TENDERS.length; i++) {
        const s = SEED_TENDERS[i];
        const createdAt = new Date(Date.now() - (SEED_TENDERS.length - i) * 3600000);

        try {
          await this.prisma.tender.upsert({
            where: { lpseId: `SEED_${i}` },
            update: {
              title: s.title,
              agency: s.agency,
              pagu: s.pagu,
              hps: s.hps,
              stage: s.stage,
              location: s.location,
              publishedAt: createdAt,
            },
            create: {
              lpseId: `SEED_${i}`,
              title: s.title,
              agency: s.agency,
              pagu: s.pagu,
              hps: s.hps,
              category: s.category,
              stage: s.stage,
              location: s.location,
              publishedAt: createdAt,
              deadlineAt: new Date(createdAt.getTime() + 30 * 24 * 3600000),
            },
          });
          count++;
        } catch (err) {
          this.logger.warn(`Seed upsert ${i} failed: ${err instanceof Error ? err.message : err}`);
        }
      }

      await this.prisma.scraperLog.create({
        data: {
          crawlerName: 'SEED_DATA',
          status: ScraperStatus.SUCCESS,
          itemsCrawled: count,
          startedAt,
          endedAt: new Date(),
        },
      });

      this.logger.log(`Seeded ${count} sample tenders`);
      return count;
    } catch (err) {
      await this.prisma.scraperLog.create({
        data: {
          crawlerName: 'SEED_DATA',
          status: ScraperStatus.CRITICAL_FAILURE,
          itemsCrawled: count,
          errorMessage: err instanceof Error ? err.message : String(err),
          startedAt,
          endedAt: new Date(),
        },
      });
      throw err;
    } finally {
      this.isSeeding = false;
    }
  }

  private async scrapeSource(source: LpseSource): Promise<number> {
    const startedAt = new Date();
    let status: ScraperStatus = ScraperStatus.SUCCESS;
    let itemsCrawled = 0;
    let errorMessage: string | null = null;

    try {
      const tenders = await this.fetchTenders(source);
      itemsCrawled = tenders.length;

      if (tenders.length === 0) {
        return 0;
      }

      let upserted = 0;
      const newTenders: TenderParseResult[] = [];
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

      if (newTenders.length > 0) {
        await this.dispatchNotifications(newTenders);
      }

      return upserted;
    } catch (err) {
      status = ScraperStatus.CRITICAL_FAILURE;
      errorMessage = err instanceof Error ? err.message : String(err);
      return 0;
    } finally {
      await this.prisma.scraperLog.create({
        data: { crawlerName: source.slug, status, itemsCrawled, errorMessage, startedAt, endedAt: new Date() },
      });
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
          const payload = {
            tenantId: alert.tenantId,
            alertId: alert.id,
            tenderTitle: tender.title,
            tenderPagu: tender.pagu.toLocaleString('id-ID'),
            tenderUrl: `https://sinyaltender.id/tenders/${tender.lpseId}`,
            emailRecipient: alert.emailAddress || undefined,
            telegramChatId: alert.telegramChatId || undefined,
          };

          if (alert.channels.includes(NotificationChannel.EMAIL) && alert.emailAddress) {
            await this.notificationService.sendEmailAlert(payload).catch((err) =>
              this.logger.warn(`Email notification failed: ${err.message}`)
            );
          }

          if (alert.channels.includes(NotificationChannel.TELEGRAM)) {
            if (alert.telegramChatId) {
              await this.notificationService.sendTelegramAlert(payload).catch((err) =>
                this.logger.warn(`Telegram notification failed: ${err.message}`)
              );
            } else if (alert.emailAddress) {
              this.logger.log(`Telegram not connected — falling back to EMAIL for ${alert.emailAddress}`);
              await this.notificationService.sendEmailAlert({ ...payload, emailRecipient: alert.emailAddress }).catch((err) =>
                this.logger.warn(`Fallback email notification failed: ${err.message}`)
              );
            }
          }

          if (alert.channels.includes(NotificationChannel.WEB_DASHBOARD)) {
            await this.prisma.notificationLog.create({
              data: {
                alertId: alert.id,
                tenantId: alert.tenantId,
                channel: NotificationChannel.WEB_DASHBOARD,
                recipient: alert.tenantId,
                message: `Tender baru: ${tender.title} (Rp ${tender.pagu.toLocaleString('id-ID')})`,
                deliveryStatus: 'SENT',
              },
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`Notification dispatch error: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async fetchTenders(source: LpseSource): Promise<TenderParseResult[]> {
    try {
      const { token, cookies } = await this.fetchSession(source);
      if (!token) {
        this.logger.warn(`[${source.slug}] Could not get authenticity token`);
        return [];
      }
      const results = await this.fetchTendersPage(source, token, cookies, 0);
      return results;
    } catch (err: any) {
      this.logger.error(`[${source.slug}] fetchTenders error: ${err.message}`);
      return [];
    }
  }

  private async fetchSession(source: LpseSource): Promise<{ token: string; cookies: string }> {
    const pageUrl = `${source.baseUrl}/lelang`;
    const res = await axios.get(pageUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      maxRedirects: 5,
    });
    const match = res.data.match(/authenticityToken\s*=\s*['"](\S+?)['"]/);
    const token = match ? match[1] : '';
    const cookies = (res.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');
    return { token, cookies };
  }

  private async fetchTendersPage(
    source: LpseSource,
    token: string,
    cookies: string,
    start: number,
    length = 200,
  ): Promise<TenderParseResult[]> {
    const apiUrl = `${source.baseUrl}/dt/lelang?tahun=2026`;
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
    const tenders = rawRows.map((row) => this.parseApiRow(row, source));

    // Stop pagination when fewer rows returned than requested (end of data)
    // recordsFiltered returns MAX_INT placeholder, so we can't rely on it
    if (rawRows.length === length) {
      const remaining = await this.fetchTendersPage(source, token, cookies, start + length, length);
      tenders.push(...remaining);
    }

    return tenders;
  }

  private parseApiRow(row: any[], source: LpseSource): TenderParseResult {
    const lpseId = `${source.slug}_${row[0] || ''}`;
    const rawTitle = (row[1] || '').replace(/<[^>]+>/g, '').trim();
    const agency = (row[2] || source.name).replace(/\s+/g, ' ').trim();
    const paguText = (row[4] || '0').replace(/\s+/g, ' ').trim();
    const statusText = (row[3] || '').toLowerCase();

    return {
      lpseId,
      title: rawTitle.replace(/\s+/g, ' ').trim(),
      agency,
      pagu: this.parseFormattedPagu(paguText),
      hps: this.parseFormattedPagu(paguText),
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
