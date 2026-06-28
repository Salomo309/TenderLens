import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { TenderStage, TenderCategory, ScraperStatus, NotificationChannel } from '@prisma/client';
import * as cheerio from 'cheerio';
import axios from 'axios';

interface LpseSource {
  name: string;
  baseUrl: string;
  slug: string;
  location: string;
}

const LPSE_SOURCES: LpseSource[] = [
  { name: 'LPSE Kemenkeu', baseUrl: 'https://lpse.kemenkeu.go.id', slug: 'LPSE_KEMEN_KEU', location: 'DKI Jakarta' },
  { name: 'LPSE Kemen PUPR', baseUrl: 'https://lpse.pu.go.id', slug: 'LPSE_KEMEN_PUPR', location: 'DKI Jakarta' },
  { name: 'LPSE DKI Jakarta', baseUrl: 'https://lpse.jakarta.go.id', slug: 'LPSE_DKI_JAKARTA', location: 'DKI Jakarta' },
  { name: 'LPSE Jawa Barat', baseUrl: 'https://lpse.jabarprov.go.id', slug: 'LPSE_JAWA_BARAT', location: 'Jawa Barat' },
  { name: 'LPSE Surabaya', baseUrl: 'https://lpse.surabaya.go.id', slug: 'LPSE_SURABAYA', location: 'Jawa Timur' },
];

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
      const results = await Promise.allSettled(
      LPSE_SOURCES.map((source) => this.scrapeSource(source))
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
            tenderUrl: `https://tenderlens.id/tenders/${tender.lpseId}`,
            emailRecipient: alert.emailAddress || undefined,
            telegramChatId: alert.telegramChatId || undefined,
          };

          if (alert.channels.includes(NotificationChannel.EMAIL) && alert.emailAddress) {
            await this.notificationService.sendEmailAlert(payload).catch((err) =>
              this.logger.warn(`Email notification failed: ${err.message}`)
            );
          }

          if (alert.channels.includes(NotificationChannel.TELEGRAM) && alert.telegramChatId) {
            await this.notificationService.sendTelegramAlert(payload).catch((err) =>
              this.logger.warn(`Telegram notification failed: ${err.message}`)
            );
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
    const urls = [
      `${source.baseUrl}/eproc4/lelang`,
      `${source.baseUrl}/eproc4/lelang/index`,
      `${source.baseUrl}/eproc4`,
    ];

    for (const url of urls) {
      try {
        const html = await this.fetchPageWithRetry(url);
        if (!html || html.length < 500) continue;

        const result = this.parseTenderTable(html, source);
        if (result.length > 0) return result;
      } catch {
        continue;
      }
    }

    return [];
  }

  private async fetchPageWithRetry(url: string, retries = 2): Promise<string | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });
        return response.data;
      } catch {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        return null;
      }
    }
    return null;
  }

  private parseTenderTable(html: string, source: LpseSource): TenderParseResult[] {
    const $ = cheerio.load(html);
    const results: TenderParseResult[] = [];

    const rows = $('table tr, tbody tr, .table-hover tr, [class*="table"] tr, .list-lelang tr, tr[data-id], tr[class*="lelang"]');

    if (rows.length === 0) {
      return this.parseFromPreOrPlainText(html, source);
    }

    rows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const linkEl = $(row).find('a[href*="pengumumanlelang"], a[href*="lelang"], td:nth-child(2) a, td:nth-child(3) a').first();
      const href = linkEl.attr('href') || '';
      const lpseId = this.extractLpseId(href, source);

      const title = linkEl.text().trim() || $(cells[1]).text().trim() || $(cells[2]).text().trim() || '';
      const agency = ($(cells[2]).text().trim() || $(cells[1]).text().trim() || '').replace(/\s+/g, ' ').trim();
      const paguText = ($(cells[4]).text().trim() || $(cells[3]).text().trim() || '0').replace(/[^0-9.,]/g, '');
      const hpsText = ($(cells[5]).text().trim() || $(cells[4]).text().trim() || '0').replace(/[^0-9.,]/g, '');
      const stageText = ($(cells[6]).text().trim() || $(cells[5]).text().trim() || '').toLowerCase();

      if (!title || title.length < 5) return;

      results.push({
        lpseId: lpseId || this.generateLpseId(title, source),
        title: title.replace(/\s+/g, ' ').trim(),
        agency: agency || source.name,
        pagu: this.parseDecimal(paguText),
        hps: this.parseDecimal(hpsText),
        category: this.inferCategory(title),
        stage: this.mapStage(stageText),
        location: source.location,
        publishedAt: new Date(),
        deadlineAt: null,
      });
    });

    if (results.length > 0) return results;
    return this.parseFromPreOrPlainText(html, source);
  }

  private parseFromPreOrPlainText(html: string, source: LpseSource): TenderParseResult[] {
    const $ = cheerio.load(html);
    const results: TenderParseResult[] = [];
    const text = $('pre, code, .well, .panel-body, .content, #content, main').text() || $('body').text();
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 20);

    for (const line of lines.slice(0, 30)) {
      if (line.includes('(') && line.length < 200) {
        results.push({
          lpseId: this.generateLpseId(line, source),
          title: line.substring(0, 120).replace(/\s+/g, ' ').trim(),
          agency: source.name,
          pagu: 0, hps: 0,
          category: TenderCategory.OTHER,
          stage: TenderStage.PENGUMUMAN,
          location: source.location,
          publishedAt: new Date(),
          deadlineAt: null,
        });
      }
    }
    return results;
  }

  private extractLpseId(href: string, source: LpseSource): string {
    const match = href.match(/(\d+)/);
    return match ? `${source.slug}_${match[1]}` : '';
  }

  private generateLpseId(title: string, source: LpseSource): string {
    const hash = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toLowerCase();
    return `${source.slug}_${hash}_${Date.now().toString(36)}`;
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
