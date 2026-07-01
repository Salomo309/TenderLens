import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TendersModule } from './modules/tenders/tenders.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { BillingModule } from './modules/billing/billing.module';
import { ScraperMonitorModule } from './modules/scraper-monitor/scraper-monitor.module';
import { HealthModule } from './modules/health/health.module';
import { CompetitorModule } from './modules/competitor/competitor.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    TendersModule,
    AlertsModule,
    BillingModule,
    ScraperMonitorModule,
    HealthModule,
    CompetitorModule,
    QueueModule.register(),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
