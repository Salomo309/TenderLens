import { ConflictException, Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
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

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.companyName, slug },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.adminName,
          passwordHash,
          emailVerificationCode: code,
          emailVerificationExpiresAt: expiresAt,
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

    // Kirim email verifikasi via Resend
    await this.sendVerificationEmail(result.user.email, code);

    return {
      message: 'Akun berhasil dibuat. Silakan cek email untuk kode verifikasi.',
      userId: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      expiresInMinutes: 15,
    };
  }

  async registerVerify(dto: RegisterVerifyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email sudah diverifikasi.');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('Tidak ada kode verifikasi. Silakan daftar ulang.');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Kode verifikasi sudah kedaluwarsa. Silakan daftar ulang.');
    }

    if (user.emailVerificationCode !== dto.code.toUpperCase()) {
      throw new BadRequestException('Kode verifikasi salah.');
    }

    const member = await this.prisma.tenantMember.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });
    if (!member) {
      throw new BadRequestException('User tidak memiliki tenant.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: member.tenantId,
      role: member.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: member.role,
      },
      tenant: {
        id: member.tenant.id,
        name: member.tenant.name,
        slug: member.tenant.slug,
      },
    };
  }

  async resendVerificationCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email sudah diverifikasi.');
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    await this.sendVerificationEmail(user.email, code);
    return { message: 'Kode verifikasi telah dikirim ulang.', expiresInMinutes: 15 };
  }

  private async sendVerificationEmail(to: string, code: string) {
    const resendKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM || 'no-reply@sinyaltender.id';

    if (!resendKey) {
      Logger.warn(`RESEND_API_KEY not set. Dev mode — verification code for ${to}: ${code}`);
      return;
    }

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: mailFrom,
          to,
          subject: '[SinyalTender] Verifikasi Email Anda',
          text: `Terima kasih telah mendaftar di SinyalTender!\n\nGunakan kode berikut untuk memverifikasi email Anda:\n\n${code}\n\nKode berlaku 15 menit.\n\nJika Anda tidak mendaftar, abaikan email ini.`,
        }),
      });
      if (!resp.ok) {
        Logger.warn(`Resend responded with ${resp.status}: ${await resp.text()}`);
      }
    } catch (err) {
      Logger.warn(`Failed to send verification email: ${err}`);
    }
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

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email belum diverifikasi. Silakan cek email Anda untuk kode verifikasi.');
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
        role: primaryMember.role,
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

  async requestEmailChange(userId: string, newEmail: string, currentPassword: string) {
    if (!currentPassword) {
      throw new BadRequestException('Password saat ini wajib diisi untuk mengganti email.');
    }

    const userForPw = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userForPw || !userForPw.passwordHash) {
      throw new BadRequestException('Akun ini tidak memiliki password.');
    }
    const pwValid = await bcrypt.compare(currentPassword, userForPw.passwordHash);
    if (!pwValid) {
      throw new UnauthorizedException('Password saat ini tidak sesuai.');
    }

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
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return { message: 'Password berhasil diperbarui. Semua sesi akan diminta login ulang.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Jangan kasih tahu apakah email terdaftar (prevent email enumeration)
      return { message: 'Jika email terdaftar, kode reset akan dikirim.' };
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationCode: code, emailVerificationExpiresAt: expiresAt },
    });

    await this.forgotPasswordEmail(user.email, code);
    return { message: 'Jika email terdaftar, kode reset akan dikirim.', expiresInMinutes: 15 };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email tidak ditemukan.');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('Tidak ada kode reset. Silakan minta kode baru.');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Kode reset sudah kedaluwarsa.');
    }

    if (user.emailVerificationCode !== code.toUpperCase()) {
      throw new BadRequestException('Kode reset salah.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { message: 'Password berhasil direset. Silakan login dengan password baru.' };
  }

  private async forgotPasswordEmail(to: string, code: string) {
    const resendKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM || 'no-reply@sinyaltender.id';

    if (!resendKey) {
      Logger.warn(`RESEND_API_KEY not set. Dev mode — reset code for ${to}: ${code}`);
      return;
    }

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: mailFrom,
          to,
          subject: '[SinyalTender] Reset Password Anda',
          text: `Gunakan kode berikut untuk mereset password Anda:\n\n${code}\n\nKode berlaku 15 menit.\n\nJika Anda tidak meminta reset password, abaikan email ini.`,
        }),
      });
      if (!resp.ok) {
        Logger.warn(`Resend responded with ${resp.status}: ${await resp.text()}`);
      }
    } catch (err) {
      Logger.warn(`Failed to send reset email: ${err}`);
    }
  }
}
