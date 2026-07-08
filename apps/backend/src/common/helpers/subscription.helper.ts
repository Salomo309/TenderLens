import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { getPlanConfig, PlanConfig } from '../constants/plans';

@Injectable()
export class SubscriptionHelper {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(tenantId: string): Promise<{ tier: string; plan: PlanConfig }> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    const tier = sub?.tier || 'FREE_TRIAL';
    return { tier, plan: getPlanConfig(tier) };
  }

  async checkKeywordLimitAtomic(tenantId: string, createFn: (tx: any) => Promise<any>): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const { plan } = await this.getPlan(tenantId);
      const count = await tx.keywordAlert.count({ where: { tenantId } });
      if (count >= plan.maxKeywords) {
        throw new ForbiddenException(
          `Batas maksimal ${plan.maxKeywords} kata kunci tercapai. Upgrade paket untuk menambah lebih banyak.`
        );
      }
      return createFn(tx);
    });
  }

  async checkSavedTenderLimitAtomic(tenantId: string, createFn: (tx: any) => Promise<any>): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const { plan } = await this.getPlan(tenantId);
      const count = await tx.savedTender.count({ where: { tenantId } });
      if (count >= plan.maxSavedTenders) {
        throw new ForbiddenException(
          `Batas maksimal ${plan.maxSavedTenders} tender tersimpan tercapai. Upgrade paket untuk menyimpan lebih banyak.`
        );
      }
      return createFn(tx);
    });
  }

  async checkAndIncrementAiSummary(tenantId: string): Promise<void> {
    const { plan } = await this.getPlan(tenantId);
    if (plan.maxAiSummariesPerMonth >= 9999) return; // unlimited tier

    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Atomic: check + increment dalam satu transaksi — cegah race condition
    await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { tenantId } });
      let used = sub?.monthlyAiSummaryUsed || 0;

      // Reset counter jika sudah lewat sebulan
      if (sub?.monthlyAiSummaryResetAt && sub.monthlyAiSummaryResetAt < now) {
        used = 0;
      }

      if (used >= plan.maxAiSummariesPerMonth) {
        throw new ForbiddenException(
          `Batas AI Summary bulanan (${plan.maxAiSummariesPerMonth}) tercapai. Upgrade paket untuk kuota lebih besar.`
        );
      }

      await tx.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          tier: 'FREE_TRIAL',
          status: 'ACTIVE',
          expiresAt: resetAt,
          monthlyAiSummaryUsed: 1,
          monthlyAiSummaryResetAt: resetAt,
        },
        update: {
          monthlyAiSummaryUsed: { increment: 1 },
          monthlyAiSummaryResetAt: resetAt,
        },
      });
    });
  }
}
