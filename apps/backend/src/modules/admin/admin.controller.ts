import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  private checkAdmin(user: JwtPayload) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Akses ditolak. Hanya SUPERADMIN.');
    }
  }

  @ApiOperation({ summary: 'List all tenants with counts (SUPERADMIN only)' })
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

  @ApiOperation({ summary: 'List all platform users (SUPERADMIN only)' })
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

  @ApiOperation({ summary: 'Get platform-wide statistics (SUPERADMIN only)' })
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

  // ─── Tenant CRUD ────────────────────────────────────────

  @ApiOperation({ summary: 'Create a new tenant (SUPERADMIN only)' })
  @Post('tenants')
  async createTenant(@CurrentUser() user: JwtPayload, @Body() dto: CreateTenantDto) {
    this.checkAdmin(user);
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const tenant = await this.prisma.tenant.create({
      data: { name: dto.name, slug },
    });
    return tenant;
  }

  @ApiOperation({ summary: 'Update a tenant (SUPERADMIN only)' })
  @Patch('tenants/:id')
  async updateTenant(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    this.checkAdmin(user);
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan.');
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
    return tenant;
  }

  @ApiOperation({ summary: 'Delete a tenant with all related data (SUPERADMIN only)' })
  @Delete('tenants/:id')
  async deleteTenant(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.checkAdmin(user);
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan.');
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'Tenant berhasil dihapus.' };
  }

  // ─── User CRUD ───────────────────────────────────────────

  @ApiOperation({ summary: 'Create a new user in a tenant (SUPERADMIN only)' })
  @Post('users')
  async createUser(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    this.checkAdmin(user);

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email sudah terdaftar.');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email: dto.email, name: dto.name || null, passwordHash },
      });
      await tx.tenantMember.create({
        data: { tenantId: dto.tenantId, userId: newUser.id, role: dto.role || 'USER' },
      });
      return newUser;
    });

    return result;
  }

  @ApiOperation({ summary: 'Update a user (SUPERADMIN only)' })
  @Patch('users/:id')
  async updateUser(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.checkAdmin(user);

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User tidak ditemukan.');

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('Email sudah terdaftar.');
    }

    const updateData: any = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.role !== undefined) {
      const member = await this.prisma.tenantMember.findFirst({ where: { userId: id } });
      if (member) {
        await this.prisma.tenantMember.update({
          where: { id: member.id },
          data: { role: dto.role as any },
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tenantMembers: { include: { tenant: { select: { id: true, name: true } } } },
      },
    });

    return updated;
  }

  @ApiOperation({ summary: 'Delete a user (SUPERADMIN only)' })
  @Delete('users/:id')
  async deleteUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.checkAdmin(user);
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User tidak ditemukan.');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User berhasil dihapus.' };
  }
}
