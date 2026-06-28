import { Module } from '@nestjs/common';
import { ScraperMonitorController } from './scraper-monitor.controller';
import { ScraperService } from './services/scraper.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ScraperMonitorController],
  providers: [ScraperService],
})
export class ScraperMonitorModule {}
