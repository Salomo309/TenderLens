import { ConflictException, Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
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
          role: 'USER',
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
        avatarUrl: result.user.avatarUrl,
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
        avatarUrl: user.avatarUrl,
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
        avatarUrl: user.avatarUrl,
        role: primaryMember.role,
      },
      tenant: {
        id: primaryMember.tenant.id,
        name: primaryMember.tenant.name,
        slug: primaryMember.tenant.slug,
      },
    };
  }

  async requestEmailChange(userId: string, newEmail: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new ConflictException('Email sudah digunakan.');
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: newEmail,
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    // Try to send verification email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM || 'no-reply@sinyaltender.id';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    let emailSent = false;
    if (resendKey && user?.email) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: mailFrom,
            to: user.email,
            subject: '[SinyalTender] Kode Verifikasi Email',
            text: `Gunakan kode berikut untuk memverifikasi email baru Anda: ${code}\n\nKode berlaku 15 menit.\n\nAbaikan jika Anda tidak meminta perubahan email.`,
          }),
        });
        emailSent = resp.ok;
        if (!resp.ok) Logger.warn(`Resend responded with ${resp.status}: ${await resp.text()}`);
      } catch (err) {
        Logger.warn(`Failed to send verification email: ${err}`);
      }
    }

    return {
      message: emailSent
        ? 'Kode verifikasi telah dikirim ke email Anda saat ini.'
        : `Kode verifikasi (dev mode): ${code}`,
      expiresInMinutes: 15,
      ...(emailSent ? {} : { devCode: code }),
    };
  }

  async verifyEmailChange(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User tidak ditemukan.');

    if (!user.pendingEmail || !user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('Tidak ada permintaan perubahan email.');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.');
    }

    if (user.emailVerificationCode !== code.toUpperCase()) {
      throw new BadRequestException('Kode verifikasi salah.');
    }

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    });

    // Propagate email change to keyword alerts using the old email
    if (oldEmail && newEmail && oldEmail !== newEmail) {
      const member = await this.prisma.tenantMember.findFirst({
        where: { userId },
        select: { tenantId: true },
      });
      if (member) {
        await this.prisma.keywordAlert.updateMany({
          where: { tenantId: member.tenantId, emailAddress: oldEmail },
          data: { emailAddress: newEmail },
        });
      }
    }

    return { message: 'Email berhasil diperbarui.', email: newEmail };
  }

  async handleGoogleLogin(profile: any) {
    const { user, jwt, payload } = profile;

    const member = await this.prisma.tenantMember.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });

    return {
      jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: payload.role,
      },
      tenant: member
        ? { id: member.tenant.id, name: member.tenant.name, slug: member.tenant.slug }
        : null,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Password lama dan baru wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Akun ini tidak memiliki password.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Password lama tidak sesuai.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password berhasil diperbarui.' };
  }
}
