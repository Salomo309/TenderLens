import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompetitorService } from './competitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('competitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competitor')
export class CompetitorController {
  constructor(private readonly competitorService: CompetitorService) {}

  @ApiOperation({ summary: 'Get competitor win history (Pro plan and above)' })
  @Get()
  async getCompetitorHistory(@CurrentUser() user: JwtPayload) {
    return this.competitorService.getCompetitorHistory(user.tenantId);
  }

  @ApiOperation({ summary: 'Get detailed competitor information by agency name' })
  @Get(':agency')
  async getCompetitorDetail(
    @CurrentUser() user: JwtPayload,
    @Param('agency') agency: string,
  ) {
    return this.competitorService.getCompetitorDetail(user.tenantId, agency);
  }
}
