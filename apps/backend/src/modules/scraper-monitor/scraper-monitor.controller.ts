import { Controller, Get, Post, Param, Query, UseGuards, Body, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @ApiOperation({ summary: 'Trigger an immediate scrape of all LPSE sources' })
  @Post('scrape')
  async triggerScrape() {
    const total = await this.scraperService.scrapeAll();
    return { message: `Scrape cycle completed. ${total} tenders processed.`, total };
  }

  @ApiOperation({ summary: 'Seed sample tender data for development/testing' })
  @Post('seed')
  async triggerSeed() {
    const total = await this.scraperService.seedData();
    return { message: `Seeded ${total} sample tenders successfully.`, total };
  }

  @ApiOperation({ summary: 'Get scraper execution logs' })
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

  @ApiOperation({ summary: 'Get scraper health and uptime for all crawlers' })
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
          uptime: uptime !== null ? parseFloat(uptime.toFixed(2)) : null,
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

  @ApiOperation({ summary: 'Debug: test-fetch a URL and return response info (SUPERADMIN only)' })
  @Post('debug-fetch')
  async debugFetch(@Body() body: { url: string }) {
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
