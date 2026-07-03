import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  tenantId: string;

  @IsEnum(() => UserRole)
  @IsOptional()
  role?: UserRole;
}
