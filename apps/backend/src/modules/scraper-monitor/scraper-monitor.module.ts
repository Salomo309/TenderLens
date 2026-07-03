import { Module } from '@nestjs/common';
import { ScraperMonitorController } from './scraper-monitor.controller';
import { ScraperService } from './services/scraper.service';
import { PuppeteerService } from './services/puppeteer.service';
import { FlaresolverrService } from './services/flaresolverr.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ScraperMonitorController],
  providers: [ScraperService, PuppeteerService, FlaresolverrService],
  exports: [ScraperService],
})
export class ScraperMonitorModule {}
