import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenantMembers: true },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    // Cek apakah password diubah setelah token dikeluarkan
    if (user.passwordChangedAt && payload.iat) {
      const changedMs = new Date(user.passwordChangedAt).getTime();
      const tokenIatMs = payload.iat * 1000;
      if (changedMs > tokenIatMs) {
        throw new UnauthorizedException('Password telah diubah. Silakan login ulang.');
      }
    }

    // Cek apakah user masih jadi member tenant
    const stillMember = user.tenantMembers.some((m) => m.tenantId === payload.tenantId);
    if (!stillMember) {
      throw new UnauthorizedException('Anda tidak lagi terdaftar di tenant ini.');
    }

    return payload;
  }
}
