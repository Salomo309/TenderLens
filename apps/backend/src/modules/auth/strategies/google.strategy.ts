import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'disabled',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'disabled',
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;
      const email = emails?.[0]?.value;
      const displayName = name?.givenName
        ? `${name.givenName} ${name.familyName || ''}`.trim()
        : profile.displayName || email;

      if (!email) {
        return done(new Error('Google account has no email'), null);
      }

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        const slug = `google-${email.split('@')[0]}-${Date.now().toString(36)}`;
        const result = await this.prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: { name: `${displayName}'s Company`, slug },
          });

          const newUser = await tx.user.create({
            data: {
              email,
              name: displayName,
              avatarUrl: photos?.[0]?.value || null,
            },
          });

          await tx.tenantMember.create({
            data: {
              tenantId: tenant.id,
              userId: newUser.id,
              role: 'USER',
            },
          });

          return { tenant, user: newUser };
        });

        user = result.user;
      }

      const member = await this.prisma.tenantMember.findFirst({
        where: { userId: user.id },
      });

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: member?.tenantId || '',
        role: member?.role || 'USER',
      };

      const jwt = this.jwtService.sign(payload);

      done(null, { user, jwt, payload });
    } catch (err) {
      this.logger.error('Google OAuth validation failed:', err);
      done(err, null);
    }
  }
}
