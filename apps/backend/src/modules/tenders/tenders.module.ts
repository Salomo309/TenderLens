import { Module } from '@nestjs/common';
import { TendersController } from './tenders.controller';
import { TendersService } from './tenders.service';
import { AiSummaryService } from './ai-summary.service';

@Module({
  controllers: [TendersController],
  providers: [TendersService, AiSummaryService],
  exports: [TendersService],
})
export class TendersModule {}
