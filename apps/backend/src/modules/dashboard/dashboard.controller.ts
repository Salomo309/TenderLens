import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: 'Get dashboard statistics for the current tenant' })
  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeAlerts,
      alertsTriggered,
      savedTenders,
      keywordActivity,
      recentTenders,
      totalTenders,
      newToday,
    ] = await Promise.all([
      this.prisma.keywordAlert.count({ where: { tenantId: user.tenantId } }),
      this.prisma.notificationLog.count({ where: { tenantId: user.tenantId } }),
      this.prisma.savedTender.count({ where: { tenantId: user.tenantId } }),
      this.prisma.keywordAlert.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, keyword: true, channels: true, createdAt: true },
      }),
      this.prisma.tender.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 4,
        select: {
          id: true, lpseId: true, title: true, agency: true,
          pagu: true, stage: true, publishedAt: true,
        },
      }),
      this.prisma.tender.count(),
      this.prisma.tender.count({ where: { publishedAt: { gte: startOfToday } } }),
    ]);

    const crawlers = await this.prisma.lpseSource.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    const crawlerData = await Promise.all(
      crawlers.slice(0, 5).map(async (s) => {
        const logs = await this.prisma.scraperLog.findMany({
          where: { crawlerName: s.slug },
          orderBy: { startedAt: 'desc' },
          take: 30,
          select: { status: true, itemsCrawled: true, startedAt: true, endedAt: true },
        });
        const total = logs.length;
        const success = logs.filter((l) => l.status === 'SUCCESS').length;
        const uptime = total > 0 ? (success / total) * 100 : null;
        const totalItems = logs.reduce((sum, l) => sum + l.itemsCrawled, 0);
        return { uptime: uptime !== null ? parseFloat(uptime.toFixed(1)) : null, totalRuns: total, totalItems };
      }),
    );

    const validUptimes = crawlerData.map((c) => c.uptime).filter((u): u is number => u !== null);
    const avgUptime = validUptimes.length > 0
      ? validUptimes.reduce((s, c) => s + c, 0) / validUptimes.length
      : 0;
    const activeCrawlers = crawlerData.filter((c) => c.totalRuns > 0).length;

    const lastLog = await this.prisma.scraperLog.findFirst({
      orderBy: { startedAt: 'desc' },
      select: { endedAt: true },
    });

    // Single aggregated query for notification counts per alert
    const alertIds = keywordActivity.map((k) => k.id);
    const countRows = alertIds.length > 0
      ? await this.prisma.notificationLog.groupBy({
          by: ['alertId'],
          where: { alertId: { in: alertIds }, tenantId: user.tenantId },
          _count: true,
        })
      : [];
    const countMap = new Map(countRows.map((r) => [r.alertId, r._count]));

    return {
      totalTenders,
      newToday,
      activeAlerts,
      alertsTriggered,
      savedTenders,
      scraperUptime: parseFloat(avgUptime.toFixed(1)),
      activeCrawlers,
      platformStatus: activeCrawlers > 0 ? 'OPERATIONAL' : 'DEGRADED',
      lastSync: lastLog?.endedAt?.toISOString() || null,
      recentTenders,
      keywordActivity: keywordActivity.map((k) => ({
        keyword: k.keyword,
        channels: k.channels,
        count: countMap.get(k.id) || 0,
        lastMatch: k.createdAt.toISOString(),
      })),
    };
  }
}
