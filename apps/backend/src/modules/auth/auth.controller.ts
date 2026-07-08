import { Body, Controller, Get, Post, Patch, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Register a new tenant company account' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Verify email with code after registration' })
  @Post('register/verify')
  registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto);
  }

  @ApiOperation({ summary: 'Resend verification code' })
  @Post('register/resend-code')
  resendCode(@Body('userId') userId: string) {
    return this.authService.resendVerificationCode(userId);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @ApiExcludeEndpoint()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const { jwt, user, tenant } = await this.authService.handleGoogleLogin(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const tenantId = tenant?.id || '';
    res.redirect(`${frontendUrl}/auth/callback#token=${jwt}&userId=${user.id}&tenantId=${tenantId}`);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
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
    @Body('currentPassword') currentPassword: string,
  ) {
    return this.authService.requestEmailChange(user.sub, newEmail, currentPassword);
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
