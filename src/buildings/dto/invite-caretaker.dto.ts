import { IsString, IsOptional, IsEmail } from 'class-validator';

export class InviteCaretakerDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;
}
