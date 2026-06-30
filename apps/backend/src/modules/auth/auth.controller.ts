import { Body, Controller, Get, Post, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body('name') name?: string,
    @Body('avatarUrl') avatarUrl?: string,
  ) {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data,
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/change')
  async requestEmailChange(
    @CurrentUser() user: JwtPayload,
    @Body('newEmail') newEmail: string,
  ) {
    return this.authService.requestEmailChange(user.sub, newEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/verify')
  async verifyEmailChange(
    @CurrentUser() user: JwtPayload,
    @Body('code') code: string,
  ) {
    return this.authService.verifyEmailChange(user.sub, code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password/change')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(user.sub, currentPassword, newPassword);
  }
}
