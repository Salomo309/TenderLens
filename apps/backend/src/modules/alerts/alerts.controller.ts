import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { SubscriptionHelper } from '../../common/helpers/subscription.helper';

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  TELEGRAM: 'Telegram',
  WEB_DASHBOARD: 'Dashboard',
};

interface CreateAlertDto {
  keyword: string;
  channels: NotificationChannel[];
  telegramChatId?: string;
  emailAddress?: string;
}

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionHelper: SubscriptionHelper,
  ) {}

  @ApiOperation({ summary: 'Get available notification channels' })
  @Get('channels')
  async getChannels() {
    const values = Object.values(NotificationChannel);
    return values.map((v) => ({ value: v, label: CHANNEL_LABELS[v] || v }));
  }

  @ApiOperation({ summary: 'Get all keyword alerts for the current tenant' })
  @Get()
  async getAlerts(@CurrentUser() user: JwtPayload) {
    return this.prisma.keywordAlert.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @ApiOperation({ summary: 'Create a new keyword alert (checks plan limits)' })
  @Post()
  async createAlert(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAlertDto
  ) {
    await this.subscriptionHelper.checkKeywordLimit(user.tenantId);

    // Auto-fill email with user's account email if not explicitly provided
    let emailAddress = dto.emailAddress;
    if (!emailAddress && dto.channels.includes('EMAIL' as any)) {
      const member = await this.prisma.tenantMember.findFirst({
        where: { userId: user.sub },
        include: { user: true },
      });
      emailAddress = member?.user.email || null;
    }

    return this.prisma.keywordAlert.create({
      data: {
        tenantId: user.tenantId,
        keyword: dto.keyword,
        channels: dto.channels,
        telegramChatId: dto.telegramChatId || null,
        emailAddress: emailAddress,
      },
    });
  }

  @ApiOperation({ summary: 'Delete a keyword alert' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlert(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ) {
    await this.prisma.keywordAlert.delete({
      where: { id, tenantId: user.tenantId },
    });
  }

  @ApiOperation({ summary: 'Get notification logs for the current tenant' })
  @Get('logs')
  async getNotificationLogs(@CurrentUser() user: JwtPayload) {
    return this.prisma.notificationLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }
}
