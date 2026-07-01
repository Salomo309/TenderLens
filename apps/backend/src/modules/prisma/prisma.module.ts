import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SubscriptionHelper } from '../../common/helpers/subscription.helper';

@Global()
@Module({
  providers: [PrismaService, SubscriptionHelper],
  exports: [PrismaService, SubscriptionHelper],
})
export class PrismaModule {}
