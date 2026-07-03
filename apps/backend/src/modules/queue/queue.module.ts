import { Module, Logger, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({})
export class QueueModule {
  static register(): DynamicModule {
    const host = process.env.REDIS_HOST;

    if (!host) {
      Logger.log('REDIS_HOST not set — Queue features disabled.', 'QueueModule');
      return { module: QueueModule, providers: [], exports: [] };
    }

    try {
      const bullRoot = BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          retryStrategy: () => null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });

      return {
        module: QueueModule,
        imports: [
          bullRoot,
          BullModule.registerQueue({ name: 'scraping' }),
          BullModule.registerQueue({ name: 'notifications' }),
          BullModule.registerQueue({ name: 'email' }),
        ],
        exports: [BullModule],
      };
    } catch (err) {
      Logger.warn(
        `Bull initialization failed: ${err.message}. Queue features disabled.`,
        'QueueModule',
      );
      return { module: QueueModule, providers: [], exports: [] };
    }
  }
}