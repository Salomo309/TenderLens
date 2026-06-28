import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  private checkAdmin(user: JwtPayload) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Akses ditolak. Hanya SUPERADMIN.');
    }
  }

  @Get('tenants')
  async getTenants(@CurrentUser() user: JwtPayload) {
    this.checkAdmin(user);
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: { select: { members: true, tendersSaved: true, alerts: true } },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return tenants;
  }

  @Get('users')
  async getUsers(@CurrentUser() user: JwtPayload) {
    this.checkAdmin(user);
    const users = await this.prisma.user.findMany({
      include: {
        tenantMembers: {
          include: { tenant: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    this.checkAdmin(user);
    const [totalTenants, totalUsers, totalTenders, totalAlerts] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.tender.count(),
      this.prisma.keywordAlert.count(),
    ]);
    return { totalTenants, totalUsers, totalTenders, totalAlerts };
  }
}
