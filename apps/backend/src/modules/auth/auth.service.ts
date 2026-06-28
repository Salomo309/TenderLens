import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const slug = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.companyName, slug },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.adminName,
          passwordHash,
        },
      });

      const member = await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'SUPERADMIN',
        },
      });

      return { tenant, user, member };
    });

    const payload: JwtPayload = {
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      role: result.member.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenantMembers: {
          include: { tenant: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau kata sandi salah.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email atau kata sandi salah.');
    }

    const primaryMember = user.tenantMembers[0];
    if (!primaryMember) {
      throw new UnauthorizedException('User tidak memiliki tenant.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: primaryMember.tenantId,
      role: primaryMember.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: primaryMember.tenant.id,
        name: primaryMember.tenant.name,
        slug: primaryMember.tenant.slug,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantMembers: {
          include: { tenant: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User tidak ditemukan.');

    const primaryMember = user.tenantMembers[0];
    if (!primaryMember) throw new UnauthorizedException('User tidak memiliki tenant.');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: primaryMember.role,
      },
      tenant: {
        id: primaryMember.tenant.id,
        name: primaryMember.tenant.name,
        slug: primaryMember.tenant.slug,
      },
    };
  }
}
