import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RegisterVerifyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}