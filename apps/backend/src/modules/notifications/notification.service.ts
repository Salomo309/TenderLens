import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';

export interface AlertDispatchPayload {
  tenantId: string;
  alertId: string;
  tenderTitle: string;
  tenderPagu: string;
  tenderUrl: string;
  emailRecipient?: string;
  telegramChatId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly mailFrom = process.env.MAIL_FROM || 'no-reply@tenderlens.id';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatch dynamic email alerts
   */
  async sendEmailAlert(payload: AlertDispatchPayload): Promise<boolean> {
    const { tenantId, alertId, tenderTitle, tenderPagu, tenderUrl, emailRecipient } = payload;
    if (!emailRecipient) return false;

    const messageContent = `
      Halo Mitra TenderLens,
      
      Tender baru yang sesuai dengan kata kunci pemantauan Anda terdeteksi:
      Judul: ${tenderTitle}
      Pagu Anggaran: Rp ${tenderPagu}
      
      Selengkapnya silakan akses portal LPSE atau detail analitik TenderLens:
      Link: ${tenderUrl}
      
      Salam,
      TenderLens Procurement Engine
    `;

    try {
      if (!this.resendApiKey) {
        this.logger.warn(`Mock Email sent to: ${emailRecipient}. Setup RESEND_API_KEY for production emails.`);
        await this.logNotification({
          tenantId,
          alertId,
          channel: NotificationChannel.EMAIL,
          recipient: emailRecipient,
          message: messageContent,
          status: 'SENT_MOCK',
        });
        return true;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.resendApiKey}`,
        },
        body: JSON.stringify({
          from: this.mailFrom,
          to: emailRecipient,
          subject: `[TenderLens Alert] Tender LPSE Baru Terdeteksi - ${tenderTitle.substring(0, 40)}...`,
          text: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API returned status ${response.status}`);
      }

      await this.logNotification({
        tenantId,
        alertId,
        channel: NotificationChannel.EMAIL,
        recipient: emailRecipient,
        message: messageContent,
        status: 'SENT',
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to dispatch Email notification to ${emailRecipient}:`, err);
      await this.logNotification({
        tenantId,
        alertId,
        channel: NotificationChannel.EMAIL,
        recipient: emailRecipient,
        message: messageContent,
        status: 'FAILED',
        error: err.message,
      });
      return false;
    }
  }

  /**
   * Dispatches messages using the Telegram Bot API
   */
  async sendTelegramAlert(payload: AlertDispatchPayload): Promise<boolean> {
    const { tenantId, alertId, tenderTitle, tenderPagu, tenderUrl, telegramChatId } = payload;
    if (!telegramChatId) return false;

    const formattedMessage = `
🔔 *Tender LPSE Baru Terdeteksi!*

*Judul:* ${tenderTitle}
*Pagu:* Rp ${tenderPagu}
*Tautan:* [Buka LPSE](${tenderUrl})

_Dikirim otomatis oleh TenderLens Platform_
    `;

    try {
      if (!this.telegramToken) {
        this.logger.warn(`Mock Telegram message sent to chat: ${telegramChatId}. Configure TELEGRAM_BOT_TOKEN for real alerts.`);
        await this.logNotification({
          tenantId,
          alertId,
          channel: NotificationChannel.TELEGRAM,
          recipient: telegramChatId,
          message: formattedMessage,
          status: 'SENT_MOCK',
        });
        return true;
      }

      const telegramUrl = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: formattedMessage,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API responded with status ${response.status}`);
      }

      await this.logNotification({
        tenantId,
        alertId,
        channel: NotificationChannel.TELEGRAM,
        recipient: telegramChatId,
        message: formattedMessage,
        status: 'SENT',
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send Telegram notification to ${telegramChatId}:`, err);
      await this.logNotification({
        tenantId,
        alertId,
        channel: NotificationChannel.TELEGRAM,
        recipient: telegramChatId,
        message: formattedMessage,
        status: 'FAILED',
        error: err.message,
      });
      return false;
    }
  }

  /**
   * Helper logs function for system audits
   */
  private async logNotification(data: {
    tenantId: string;
    alertId: string;
    channel: NotificationChannel;
    recipient: string;
    message: string;
    status: string;
    error?: string;
  }) {
    await this.prisma.notificationLog.create({
      data: {
        alertId: data.alertId,
        tenantId: data.tenantId,
        channel: data.channel,
        recipient: data.recipient,
        message: data.message,
        deliveryStatus: data.status,
        errorMessage: data.error || null,
      },
    });
  }
}
