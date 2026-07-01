import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionHelper } from '../../common/helpers/subscription.helper';

@Injectable()
export class CompetitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionHelper: SubscriptionHelper,
  ) {}

  async getCompetitorHistory(tenantId: string) {
    const { plan } = await this.subscriptionHelper.getPlan(tenantId);
    if (!plan.competitorHistory) {
      throw new ForbiddenException(
        'Fitur Histori Kompetitor hanya tersedia untuk paket Pro ke atas. Silakan upgrade.',
      );
    }

    const tenders = await this.prisma.tender.findMany({
      where: {
        stage: 'SELESAI',
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    const agencyWins = new Map<string, { total: number; totalPagu: number; tenders: any[] }>();

    for (const t of tenders) {
      const key = t.agency;
      if (!agencyWins.has(key)) {
        agencyWins.set(key, { total: 0, totalPagu: 0, tenders: [] });
      }
      const record = agencyWins.get(key)!;
      record.total++;
      record.totalPagu += Number(t.pagu);
      record.tenders.push({
        id: t.id,
        title: t.title,
        pagu: Number(t.pagu),
        category: t.category,
        publishedAt: t.publishedAt,
        location: t.location,
      });
    }

    const competitors = Array.from(agencyWins.entries())
      .map(([agency, data]) => ({
        agency,
        totalWon: data.total,
        totalPagu: data.totalPagu,
        tenders: data.tenders.slice(0, 10),
      }))
      .sort((a, b) => b.totalPagu - a.totalPagu);

    return {
      totalCompetitors: competitors.length,
      totalTendersWon: competitors.reduce((s, c) => s + c.totalWon, 0),
      competitors,
    };
  }

  async getCompetitorDetail(tenantId: string, agency: string) {
    const { plan } = await this.subscriptionHelper.getPlan(tenantId);
    if (!plan.competitorHistory) {
      throw new ForbiddenException('Fitur ini hanya tersedia untuk paket Pro ke atas.');
    }

    const tenders = await this.prisma.tender.findMany({
      where: {
        agency: { contains: agency, mode: 'insensitive' },
        stage: 'SELESAI',
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    const categoryBreakdown: Record<string, number> = {};
    let totalPagu = 0;

    for (const t of tenders) {
      const cat = t.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      totalPagu += Number(t.pagu);
    }

    return {
      agency,
      totalWon: tenders.length,
      totalPagu,
      categoryBreakdown,
      tenders: tenders.map((t) => ({
        id: t.id,
        title: t.title,
        pagu: Number(t.pagu),
        category: t.category,
        location: t.location,
        publishedAt: t.publishedAt,
      })),
    };
  }
}
