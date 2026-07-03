import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TendersService, QueryTendersDto } from './tenders.service';
import { TenderCategory, TenderStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionHelper } from '../../common/helpers/subscription.helper';

@ApiTags('tenders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenders')
export class TendersController {
  constructor(
    private readonly tendersService: TendersService,
    private readonly prisma: PrismaService,
    private readonly subscriptionHelper: SubscriptionHelper,
  ) {}

  @ApiOperation({ summary: 'Get all tender categories' })
  @Get('categories')
  async getCategories() {
    const values = Object.values(TenderCategory);
    return values.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }

  @ApiOperation({ summary: 'Get active LPSE sources for filter dropdown' })
  @Get('sources')
  async getSources() {
    return this.prisma.lpseSource.findMany({
      where: { isActive: true },
      select: { slug: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });
  }

  @ApiOperation({ summary: 'Search and filter LPSE tenders with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false, enum: TenderCategory })
  @ApiQuery({ name: 'stage', required: false, enum: TenderStage })
  @ApiQuery({ name: 'minPagu', required: false })
  @ApiQuery({ name: 'maxPagu', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'source', required: false })
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
    @Query('source') source?: string,
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
      source,
    });
  }

  @ApiOperation({ summary: 'Get saved/bookmarked tenders for the current tenant' })
  @Get('saved')
  async getSavedTenders(@CurrentUser() user: JwtPayload) {
    return this.tendersService.findSaved(user.tenantId);
  }

  @ApiOperation({ summary: 'Get tender by ID' })
  @Get(':id')
  async getTenderById(@Param('id') id: string) {
    return this.tendersService.findOne(id);
  }

  @ApiOperation({ summary: 'Trigger AI summary generation for a tender' })
  @Post(':id/summary')
  @HttpCode(HttpStatus.OK)
  async triggerAiSummary(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.subscriptionHelper.checkAndIncrementAiSummary(user.tenantId);
    const result = await this.tendersService.generateAiSummary(id);
    return result;
  }

  @ApiOperation({ summary: 'Toggle saved status of a tender' })
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
