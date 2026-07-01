import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TelegramController } from './telegram.controller';
import { TelegramBotService } from './telegram-bot.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  controllers: [TelegramController],
  providers: [NotificationService, NotificationsGateway, TelegramBotService],
  exports: [NotificationService, NotificationsGateway],
})
export class NotificationsModule {}
