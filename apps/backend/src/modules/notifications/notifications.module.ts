import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TelegramController } from './telegram.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TelegramController],
  providers: [NotificationService, PrismaService],
  exports: [NotificationService],
})
export class NotificationsModule {}
