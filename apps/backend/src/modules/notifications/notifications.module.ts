import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { TelegramController } from './telegram.controller';
import { TelegramBotService } from './telegram-bot.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [TelegramController],
  providers: [NotificationService, NotificationsGateway, TelegramBotService],
  exports: [NotificationService, NotificationsGateway],
})
export class NotificationsModule {}
