import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScraperService } from './services/scraper.service';

@UseGuards(JwtAuthGuard)
@Controller('scraper-monitor')
export class ScraperMonitorController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
  ) {}

  @Post('scrape')
  async triggerScrape() {
    const total = await this.scraperService.scrapeAll();
    return { message: `Scrape cycle completed. ${total} tenders processed.`, total };
  }

  @Post('seed')
  async triggerSeed() {
    const total = await this.scraperService.seedData();
    return { message: `Seeded ${total} sample tenders successfully.`, total };
  }

  /**
   * Fetch paginated list of crawler executions
   */
  @Get('logs')
  async getLogs(
    @Query('status') status?: ScraperStatus,
    @Query('crawler') crawler?: string,
    @Query('limit') limit?: number
  ) {
    const limitCount = Number(limit) || 20;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (crawler) {
      where.crawlerName = { contains: crawler, mode: 'insensitive' };
    }

    return this.prisma.scraperLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limitCount,
    });
  }

  /**
   * Aggregate reports outlining uptime percentages and scrape counts per crawler agent
   */
  @Get('health')
  async getUptimeHealth() {
    const activeCrawlers = [
      'LPSE_KEMEN_KEU',
      'LPSE_KEMEN_PUPR',
      'LPSE_DKI_JAKARTA',
      'LPSE_JAWA_BARAT',
      'LPSE_SURABAYA',
    ];

    const healthReports = await Promise.all(
      activeCrawlers.map(async (crawler) => {
        const logs = await this.prisma.scraperLog.findMany({
          where: { crawlerName: crawler },
          orderBy: { startedAt: 'desc' },
          take: 30, // Evaluate past 30 runs
        });

        const totalRuns = logs.length;
        const successRuns = logs.filter((l) => l.status === ScraperStatus.SUCCESS).length;
        const failedRuns = logs.filter((l) => l.status === ScraperStatus.CRITICAL_FAILURE).length;
        
        const uptime = totalRuns > 0 ? (successRuns / totalRuns) * 100 : null;
        const totalItemsCrawled = logs.reduce((sum, item) => sum + item.itemsCrawled, 0);

        return {
          crawlerName: crawler,
          uptime: parseFloat(uptime.toFixed(2)),
          totalRuns,
          successRuns,
          failedRuns,
          totalItemsCrawled,
          lastActive: logs[0]?.startedAt || null,
          currentStatus: logs[0]?.status || 'OFFLINE',
        };
      })
    );

    return {
      status: 'OPERATIONAL',
      updatedAt: new Date().toISOString(),
      crawlers: healthReports,
    };
  }
}
