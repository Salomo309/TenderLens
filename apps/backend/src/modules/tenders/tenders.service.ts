import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiSummaryService } from './ai-summary.service';
import { TenderCategory, TenderStage, Prisma } from '@prisma/client';

export interface QueryTendersDto {
  page?: number;
  limit?: number;
  search?: string;
  category?: TenderCategory;
  stage?: TenderStage;
  minPagu?: number;
  maxPagu?: number;
  location?: string;
  source?: string;
}

@Injectable()
export class TendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSummaryService: AiSummaryService
  ) {}

  /**
   * Search and filter procurement tenders based on user configurations
   */
  async findAll(query: QueryTendersDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TenderWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { agency: { contains: query.search, mode: 'insensitive' } },
        { lpseId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.stage) {
      where.stage = query.stage;
    }

    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    if (query.source) {
      where.lpseId = { startsWith: query.source + '_' };
    }

    if (query.minPagu || query.maxPagu) {
      where.pagu = {};
      if (query.minPagu) {
        where.pagu.gte = new Prisma.Decimal(query.minPagu);
      }
      if (query.maxPagu) {
        where.pagu.lte = new Prisma.Decimal(query.maxPagu);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.tender.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tender.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve tender detail metrics
   */
  async findOne(id: string) {
    const tender = await this.prisma.tender.findUnique({
      where: { id },
    });

    if (!tender) {
      throw new NotFoundException(`Tender record with ID ${id} not found.`);
    }

    return tender;
  }

  /**
   * Triggers Gemini analysis processing for a specific tender raw HTML body
   */
  async generateAiSummary(id: string) {
    const tender = await this.findOne(id);
    const rawText = tender.rawHtml || `${tender.title}. ${tender.agency}.`;
    
    const summary = await this.aiSummaryService.generateTenderSummary(rawText);

    // Save summary payload back to database
    return this.prisma.tender.update({
      where: { id },
      data: {
        aiSummary: summary as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Saved & Bookmarked toggler for specific tenant scopes
   */
  async toggleSavedStatus(tenantId: string, tenderId: string) {
    const existing = await this.prisma.savedTender.findUnique({
      where: {
        tenantId_tenderId: { tenantId, tenderId },
      },
    });

    if (existing) {
      await this.prisma.savedTender.delete({
        where: {
          tenantId_tenderId: { tenantId, tenderId },
        },
      });
      return { saved: false };
    } else {
      await this.prisma.savedTender.create({
        data: { tenantId, tenderId },
      });
      return { saved: true };
    }
  }

  /**
   * Fetch all saved records for tenant
   */
  async findSaved(tenantId: string) {
    return this.prisma.savedTender.findMany({
      where: { tenantId },
      include: { tender: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
