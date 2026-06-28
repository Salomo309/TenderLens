import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    const [
      totalTenders,
      newToday,
      activeAlerts,
      alertsTriggered,
      recentTenders,
      keywordActivity,
    ] = await Promise.all([
      this.prisma.tender.count(),
      this.prisma.tender.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.keywordAlert.count({ where: { tenantId: user.tenantId } }),
      this.prisma.notificationLog.count({ where: { tenantId: user.tenantId } }),
      this.prisma.tender.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 4,
        select: {
          id: true, lpseId: true, title: true, agency: true,
          pagu: true, stage: true, publishedAt: true,
        },
      }),
      this.prisma.keywordAlert.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }).then((alerts) => alerts.map((a) => ({
        keyword: a.keyword,
        channels: a.channels,
        createdAt: a.createdAt,
        id: a.id,
      }))),
    ]);

    const crawlers = ['LPSE_KEMEN_KEU', 'LPSE_KEMEN_PUPR', 'LPSE_DKI_JAKARTA', 'LPSE_JAWA_BARAT'];
    const crawlerData = await Promise.all(
      crawlers.map(async (name) => {
        const logs = await this.prisma.scraperLog.findMany({
          where: { crawlerName: name },
          orderBy: { startedAt: 'desc' },
          take: 30,
        });
        const total = logs.length;
        const success = logs.filter((l) => l.status === 'SUCCESS').length;
        const uptime = total > 0 ? (success / total) * 100 : null;
        return { uptime: parseFloat(uptime.toFixed(1)), totalRuns: total };
      }),
    );

    const validUptimes = crawlerData.map((c) => c.uptime).filter((u): u is number => u !== null);
    const avgUptime = validUptimes.length > 0
      ? validUptimes.reduce((s, c) => s + c, 0) / validUptimes.length
      : 0;
    const activeCrawlers = crawlerData.filter((c) => c.totalRuns > 0).length;

    const lastLog = await this.prisma.scraperLog.findFirst({ orderBy: { startedAt: 'desc' } });

    return {
      totalTenders,
      newToday,
      activeAlerts,
      alertsTriggered,
      scraperUptime: parseFloat(avgUptime.toFixed(1)),
      activeCrawlers,
      platformStatus: activeCrawlers > 0 ? 'OPERATIONAL' : 'DEGRADED',
      lastSync: lastLog?.endedAt?.toISOString() || null,
      recentTenders,
      keywordActivity: await Promise.all(keywordActivity.map(async (k) => ({
        keyword: k.keyword,
        channels: k.channels,
        count: await this.prisma.notificationLog.count({
          where: { alertId: k.id, tenantId: user.tenantId },
        }),
        lastMatch: k.createdAt.toISOString(),
      }))),
    };
  }
}
