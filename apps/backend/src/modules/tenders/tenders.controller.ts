import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TendersService, QueryTendersDto } from './tenders.service';
import { TenderCategory, TenderStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionHelper } from '../../common/helpers/subscription.helper';

@UseGuards(JwtAuthGuard)
@Controller('tenders')
export class TendersController {
  private subscriptionHelper: SubscriptionHelper;

  constructor(
    private readonly tendersService: TendersService,
    private readonly prisma: PrismaService,
  ) {
    this.subscriptionHelper = new SubscriptionHelper(this.prisma);
  }

  @Get('categories')
  async getCategories() {
    const values = Object.values(TenderCategory);
    return values.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }

  @Get()
  async getTenders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: TenderCategory,
    @Query('stage') stage?: TenderStage,
    @Query('minPagu') minPagu?: number,
    @Query('maxPagu') maxPagu?: number,
    @Query('location') location?: string,
  ) {
    return this.tendersService.findAll({
      page,
      limit,
      search,
      category,
      stage,
      minPagu,
      maxPagu,
      location,
    });
  }

  @Get('saved')
  async getSavedTenders(@CurrentUser() user: JwtPayload) {
    return this.tendersService.findSaved(user.tenantId);
  }

  @Get(':id')
  async getTenderById(@Param('id') id: string) {
    return this.tendersService.findOne(id);
  }

  @Post(':id/summary')
  @HttpCode(HttpStatus.OK)
  async triggerAiSummary(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.subscriptionHelper.checkAiSummaryLimit(user.tenantId);
    const result = await this.tendersService.generateAiSummary(id);
    await this.subscriptionHelper.incrementAiSummaryUsed(user.tenantId);
    return result;
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  async toggleSaveTender(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Check if already saved (if so, unsaving should always be allowed)
    const existing = await this.prisma.savedTender.findUnique({
      where: { tenantId_tenderId: { tenantId: user.tenantId, tenderId: id } },
    });
    if (!existing) {
      await this.subscriptionHelper.checkSavedTenderLimit(user.tenantId);
    }
    return this.tendersService.toggleSavedStatus(user.tenantId, id);
  }
}
