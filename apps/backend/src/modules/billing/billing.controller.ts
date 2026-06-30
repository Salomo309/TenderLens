import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { BillingService, MidtransNotificationDto } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, getPlanConfig } from '../../common/constants/plans';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  async getSubscription(@CurrentUser() user: JwtPayload) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const tier = (subscription?.tier || 'FREE_TRIAL') as string;
    const plan = getPlanConfig(tier);

    return { subscription, invoices, plan, allPlans: PLANS };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  async requestUpgrade(
    @CurrentUser() user: JwtPayload,
    @Body('tier') tier?: string,
  ) {
    const targetTier = tier || 'PRO';
    if (!PLANS[targetTier] || targetTier === 'FREE_TRIAL') {
      throw new BadRequestException('Tier tidak valid');
    }

    const plan = getPlanConfig(targetTier);
    if (plan.price === 0) {
      // Enterprise: langsung aktivasi tanpa pembayaran
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      await this.prisma.subscription.upsert({
        where: { tenantId: user.tenantId },
        update: { tier: targetTier as any, status: 'ACTIVE', expiresAt: expirationDate },
        create: { tenantId: user.tenantId, tier: targetTier as any, status: 'ACTIVE', expiresAt: expirationDate },
      });

      return { message: `Lisensi ${plan.label} berhasil diaktifkan.`, snapToken: null, invoice: null };
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });

    // Expire all pending invoices before creating a new one
    await this.prisma.invoice.updateMany({
      where: { tenantId: user.tenantId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    const result = await this.billingService.createSubscriptionInvoice(
      user.tenantId,
      targetTier,
      plan.price,
      dbUser?.email || user.email,
      dbUser?.name || tenant?.name || 'Customer'
    );

    return {
      message: 'Checkout token generated successfully.',
      snapToken: result.snapToken,
      invoice: result.invoice,
      tier: targetTier,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleMidtransWebhook(@Body() notification: MidtransNotificationDto) {
    return this.billingService.handleNotification(notification);
  }
}
