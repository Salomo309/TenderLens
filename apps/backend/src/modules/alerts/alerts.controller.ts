import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

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

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('channels')
  async getChannels() {
    const values = Object.values(NotificationChannel);
    return values.map((v) => ({ value: v, label: CHANNEL_LABELS[v] || v }));
  }

  @Get()
  async getAlerts(@CurrentUser() user: JwtPayload) {
    return this.prisma.keywordAlert.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async createAlert(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAlertDto
  ) {
    return this.prisma.keywordAlert.create({
      data: {
        tenantId: user.tenantId,
        keyword: dto.keyword,
        channels: dto.channels,
        telegramChatId: dto.telegramChatId || null,
        emailAddress: dto.emailAddress || null,
      },
    });
  }

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

  @Get('logs')
  async getNotificationLogs(@CurrentUser() user: JwtPayload) {
    return this.prisma.notificationLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }
}
