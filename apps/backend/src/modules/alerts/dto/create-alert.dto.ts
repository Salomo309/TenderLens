import { IsString, IsArray, IsOptional, MinLength, ArrayMinSize, IsEnum } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateAlertDto {
  @IsString()
  @MinLength(1)
  keyword: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  emailAddress?: string;
}
