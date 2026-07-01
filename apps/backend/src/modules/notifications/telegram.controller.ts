import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { TelegramBotService } from './telegram-bot.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  @ApiOperation({ summary: 'Get Telegram bot status' })
  @Get('bot-status')
  getBotStatus() {
    return {
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'TenderLensBot',
      polling: this.telegramBotService.isRunning(),
      botTokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
    };
  }

  @Get('bot-info')
  async getBotInfo(@CurrentUser() user: JwtPayload) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { telegramChatId: true, telegramConnectedAt: true },
    });

    return {
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'TenderLensBot',
      connected: !!tenant?.telegramChatId,
      telegramChatId: tenant?.telegramChatId || null,
      connectedAt: tenant?.telegramConnectedAt || null,
    };
  }

  @Post('connect')
  async connectTelegram(
    @CurrentUser() user: JwtPayload,
    @Body('telegramChatId') telegramChatId: string,
  ) {
    if (!telegramChatId || telegramChatId.trim().length === 0) {
      return { success: false, message: 'Telegram Chat ID tidak boleh kosong.' };
    }

    const cleaned = telegramChatId.trim();

    // Send test message
    const sent = await this.notificationService.sendTelegramAlert({
      tenantId: user.tenantId,
      alertId: null,
      tenderTitle: '🔗 Test Koneksi Telegram',
      tenderPagu: '0',
      tenderUrl: '',
      telegramChatId: cleaned,
      emailRecipient: undefined,
    });

    // Save regardless (user can test manually)
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        telegramChatId: cleaned,
        telegramConnectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: sent
        ? 'Koneksi berhasil! Cek pesan uji coba di Telegram Anda.'
        : 'Chat ID tersimpan. Jika tidak menerima pesan, periksa token bot Telegram di pengaturan server.',
      telegramChatId: cleaned,
    };
  }

  @Delete('disconnect')
  async disconnectTelegram(@CurrentUser() user: JwtPayload) {
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        telegramChatId: null,
        telegramConnectedAt: null,
      },
    });

    return { success: true, message: 'Akun Telegram berhasil diputuskan.' };
  }
}
