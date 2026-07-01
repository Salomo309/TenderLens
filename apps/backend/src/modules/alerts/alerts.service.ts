import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Periodic engine scheduled via NestJS Cron.
   * Runs every 5 minutes scanning newly parsed tenders for tenant keyword matches.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async matchKeywordsAndAlert() {
    if (this.isProcessing) {
      this.logger.warn('Keyword alert scanning already in progress. Skipping execution cycle.');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting keyword alerts matching processor...');

    try {
      // 1. Fetch alerts matching keyword configs
      const alerts = await this.prisma.keywordAlert.findMany({
        include: {
          tenant: {
            include: {
              members: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (alerts.length === 0) {
        this.isProcessing = false;
        return;
      }

      // 2. Scan Tenders registered in the last 15 minutes to guarantee processing coverage
      const lookbackPeriod = new Date(Date.now() - 15 * 60 * 1000);
      const newTenders = await this.prisma.tender.findMany({
        where: {
          createdAt: { gte: lookbackPeriod },
        },
      });

      this.logger.log(`Scanning ${newTenders.length} new tenders against ${alerts.length} active keyword configurations.`);

      for (const alert of alerts) {
        const escapedKeyword = alert.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = escapedKeyword.replace(/%/g, '.*').replace(/_/g, '.');
        const lowerKeyword = alert.keyword.toLowerCase();

        for (const tender of newTenders) {
          const matchTitle = tender.title.toLowerCase().includes(lowerKeyword);
          const matchAgency = tender.agency.toLowerCase().includes(lowerKeyword);

          if (matchTitle || matchAgency) {
            // Check if alert log already recorded to prevent duplicate sends
            const alreadyNotified = await this.prisma.notificationLog.findFirst({
              where: {
                alertId: alert.id,
                tenantId: alert.tenantId,
                message: { contains: tender.id },
              },
            });

            if (alreadyNotified) continue;

            this.logger.log(`Match Found! Keyword "${alert.keyword}" matched tender ${tender.id} (${tender.title})`);

            // 3. Dispatch across configured notification channels
            for (const channel of alert.channels) {
              const dispatchPayload = {
                tenantId: alert.tenantId,
                alertId: alert.id,
                tenderTitle: tender.title,
                tenderPagu: tender.pagu.toString(),
                tenderUrl: `${process.env.FRONTEND_URL}/dashboard/tenders/${tender.id}`,
              };

              const resolveEmail = () => alert.emailAddress || alert.tenant.members[0]?.user.email;

              if (channel === NotificationChannel.TELEGRAM) {
                if (alert.telegramChatId) {
                  await this.notificationService.sendTelegramAlert({
                    ...dispatchPayload,
                    telegramChatId: alert.telegramChatId,
                  });
                } else {
                  const fallbackEmail = resolveEmail();
                  if (fallbackEmail) {
                    this.logger.log(`Telegram not connected — falling back to EMAIL for ${fallbackEmail}`);
                    await this.notificationService.sendEmailAlert({
                      ...dispatchPayload,
                      emailRecipient: fallbackEmail,
                    });
                  }
                }
              }

              if (channel === NotificationChannel.EMAIL) {
                const recipientEmail = resolveEmail();
                if (recipientEmail) {
                  await this.notificationService.sendEmailAlert({
                    ...dispatchPayload,
                    emailRecipient: recipientEmail,
                  });
                }
              }

              // WEB_DASHBOARD triggers standard in-app notifications
              if (channel === NotificationChannel.WEB_DASHBOARD) {
                await this.prisma.notificationLog.create({
                  data: {
                    alertId: alert.id,
                    tenantId: alert.tenantId,
                    channel: NotificationChannel.WEB_DASHBOARD,
                    recipient: alert.tenantId,
                    message: `Tender Baru Terdeteksi: ${tender.title}. Pagu Rp ${tender.pagu}.`,
                    deliveryStatus: 'SENT',
                  },
                });
                this.notificationsGateway.sendAlert(alert.tenantId, {
                  title: 'Tender Baru Terdeteksi',
                  message: `${tender.title} - Pagu Rp ${tender.pagu}`,
                  tenderId: tender.id,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Critical failure running keyword matching alerts job:', error);
    } finally {
      this.isProcessing = false;
      this.logger.log('Keyword alerts matching processor completed execution.');
    }
  }
}
