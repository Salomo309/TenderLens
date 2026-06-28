import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { BillingService, MidtransNotificationDto } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

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

    const plans: Record<string, { label: string; price: number; features: string[] }> = {
      FREE_TRIAL: {
        label: 'Free Trial',
        price: 0,
        features: [
          'Pantau hingga 10 tender aktif',
          '1 Kata kunci alarm',
          'Notifikasi via Dashboard',
          'AI Ringkasan Standar',
        ],
      },
      PRO: {
        label: 'Pro License',
        price: 799000,
        features: [
          'Akses Tender LPSE Unlimited',
          'Unlimited Kata Kunci Pemantau',
          'Alert Instan Telegram & Email',
          'Prioritas AI Ringkasan Dokumen',
        ],
      },
      ENTERPRISE: {
        label: 'Enterprise License',
        price: 0,
        features: [
          'Akses Semua LPSE + API',
          'Dedicated Account Manager',
          'Kustom Alert & Integrasi',
          'Prioritas Support 24/7',
        ],
      },
    };

    const tier = (subscription?.tier || 'FREE_TRIAL') as string;
    const plan = plans[tier] || plans.FREE_TRIAL;

    return { subscription, invoices, plan };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  async requestUpgrade(@CurrentUser() user: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });

    // Expire all pending invoices before creating a new one
    await this.prisma.invoice.updateMany({
      where: { tenantId: user.tenantId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    // Triggers invoice generation
    const result = await this.billingService.createSubscriptionInvoice(
      user.tenantId,
      dbUser?.email || user.email,
      dbUser?.name || tenant?.name || 'Customer'
    );

    return {
      message: 'Checkout token generated successfully.',
      snapToken: result.snapToken,
      invoice: result.invoice,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleMidtransWebhook(@Body() notification: MidtransNotificationDto) {
    return this.billingService.handleNotification(notification);
  }
}
