import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { getPlanConfig, PlanConfig } from '../constants/plans';

export class SubscriptionHelper {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(tenantId: string): Promise<{ tier: string; plan: PlanConfig }> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    const tier = sub?.tier || 'FREE_TRIAL';
    return { tier, plan: getPlanConfig(tier) };
  }

  async checkKeywordLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getPlan(tenantId);
    const count = await this.prisma.keywordAlert.count({ where: { tenantId } });
    if (count >= plan.maxKeywords) {
      throw new ForbiddenException(
        `Batas maksimal ${plan.maxKeywords} kata kunci tercapai. Upgrade paket untuk menambah lebih banyak.`
      );
    }
  }

  async checkSavedTenderLimit(tenantId: string): Promise<void> {
    const { plan } = await this.getPlan(tenantId);
    const count = await this.prisma.savedTender.count({ where: { tenantId } });
    if (count >= plan.maxSavedTenders) {
      throw new ForbiddenException(
        `Batas maksimal ${plan.maxSavedTenders} tender tersimpan tercapai. Upgrade paket untuk menyimpan lebih banyak.`
      );
    }
  }

  async checkAiSummaryLimit(tenantId: string): Promise<void> {
    const { plan, tier } = await this.getPlan(tenantId);
    if (plan.maxAiSummariesPerMonth >= 9999) return; // unlimited tier

    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) return;

    // Reset counter if a month has passed
    const now = new Date();
    if (sub.monthlyAiSummaryResetAt && sub.monthlyAiSummaryResetAt < now) {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { monthlyAiSummaryUsed: 0, monthlyAiSummaryResetAt: null },
      });
    }

    if (sub.monthlyAiSummaryUsed >= plan.maxAiSummariesPerMonth) {
      throw new ForbiddenException(
        `Batas AI Summary bulanan (${plan.maxAiSummariesPerMonth}) tercapai. Upgrade paket untuk kuota lebih besar.`
      );
    }
  }

  async incrementAiSummaryUsed(tenantId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) return;

    const now = new Date();
    // Set reset time to next month if not set
    const resetAt = sub.monthlyAiSummaryResetAt || new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        monthlyAiSummaryUsed: { increment: 1 },
        monthlyAiSummaryResetAt: resetAt,
      },
    });
  }
}
