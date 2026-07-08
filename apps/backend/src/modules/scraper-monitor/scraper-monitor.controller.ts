import { Controller, Get, Post, Param, Query, UseGuards, Body, HttpException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ScraperService } from './services/scraper.service';
import axios from 'axios';

@ApiTags('scraper')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scraper-monitor')
export class ScraperMonitorController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
  ) {}

  private checkSuperadmin(user: JwtPayload) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Akses ditolak. Hanya SUPERADMIN.');
    }
  }

  @ApiOperation({ summary: 'Trigger an immediate scrape of all LPSE sources (SUPERADMIN only)' })
  @Post('scrape')
  async triggerScrape(@CurrentUser() user: JwtPayload) {
    this.checkSuperadmin(user);
    const total = await this.scraperService.scrapeAll();
    return { message: `Scrape cycle completed. ${total} tenders processed.`, total };
  }

  @ApiOperation({ summary: 'Get scraper execution logs' })
  @Get('logs')
  async getLogs(
    @CurrentUser() user: JwtPayload,
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

  @ApiOperation({ summary: 'Get scraper health and uptime for all crawlers' })
  @Get('health')
  async getUptimeHealth(@CurrentUser() user: JwtPayload) {
    const sources = await this.prisma.lpseSource.findMany({
      select: { slug: true, name: true, isActive: true },
    });

    const crawlerNames = sources.map((s) => s.slug);

    const sourceMap = new Map(sources.map((s) => [s.slug, s.isActive]));

    const healthReports = await Promise.all(
      crawlerNames.map(async (slug) => {
        const logs = await this.prisma.scraperLog.findMany({
          where: { crawlerName: slug },
          orderBy: { startedAt: 'desc' },
          take: 30,
        });

        const totalRuns = logs.length;
        const successRuns = logs.filter((l) => l.status === ScraperStatus.SUCCESS).length;
        const failedRuns = logs.filter((l) => l.status === ScraperStatus.CRITICAL_FAILURE).length;

        const uptime = totalRuns > 0 ? (successRuns / totalRuns) * 100 : null;
        const totalItemsCrawled = logs.reduce((sum, item) => sum + item.itemsCrawled, 0);

        return {
          crawlerName: slug,
          uptime: uptime !== null ? parseFloat(uptime.toFixed(2)) : null,
          totalRuns,
          successRuns,
          failedRuns,
          totalItemsCrawled,
          lastActive: logs[0]?.startedAt || null,
          currentStatus: logs[0]?.status || 'OFFLINE',
          isActive: sourceMap.get(slug) ?? false,
        };
      })
    );

    // Urutkan: active di atas, lalu sisanya
    healthReports.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

    // Alert SUPERADMIN jika ada crawler dengan uptime di bawah 60%
    const criticalCrawlers = healthReports.filter(
      (r) => r.uptime !== null && r.uptime < 60 && r.totalRuns >= 5
    );
    if (criticalCrawlers.length > 0) {
      this.scraperService.alertCrawlerFailures(criticalCrawlers).catch((err) =>
        console.error('Failed to alert crawler failures:', err)
      );
    }

    return {
      status: 'OPERATIONAL',
      updatedAt: new Date().toISOString(),
      crawlers: healthReports,
    };
  }

  @ApiOperation({ summary: 'Debug: test-fetch a URL and return response info (SUPERADMIN only)' })
  @Post('debug-fetch')
  async debugFetch(@CurrentUser() user: JwtPayload, @Body() body: { url: string }) {
    this.checkSuperadmin(user);
    if (!body.url) throw new HttpException('URL required', 400);
    try {
      const response = await axios.get(body.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      });
      return {
        url: body.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        contentLength: (response.data || '').length,
        contentType: response.headers['content-type'],
        preview: (response.data || '').substring(0, 3000),
      };
    } catch (err: any) {
      return {
        url: body.url,
        error: err?.code || err?.message || 'Unknown error',
      };
    }
  }
}
