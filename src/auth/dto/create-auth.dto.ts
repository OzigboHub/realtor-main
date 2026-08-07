import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'USER',
    enum: [Role.USER, Role.ADMIN, Role.LANDLORD, Role.CARETAKER, Role.TENANT, Role.AGENT],
    required: false,
    description: 'SUPER_ADMIN cannot self-register.',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: 'uuid-of-property',
    required: false,
    description: 'Required for CARETAKER and TENANT registrations.',
  })
  @ValidateIf((o) => o.role === Role.CARETAKER || o.role === Role.TENANT)
  @IsNotEmpty({ message: 'propertyId is required for CARETAKER and TENANT registration.' })
  @IsUUID('4', { message: 'propertyId must be a valid UUID.' })
  propertyId?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-from-email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

