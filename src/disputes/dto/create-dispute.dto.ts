import { IsNotEmpty, IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { DisputeCategory } from '@prisma/client';

export class CreateDisputeDto {
  @IsEnum(DisputeCategory)
  @IsNotEmpty()
  category: DisputeCategory;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  respondentId: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  leaseId?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];
}
