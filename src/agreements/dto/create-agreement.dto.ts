import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsPositive,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ManagementScope } from '@prisma/client';

export class CreateAgreementDto {
  @ApiProperty({
    enum: ManagementScope,
    description:
      'Scope of authority granted to the Caretaker. ' +
      'RENT_COLLECTION: rent logging only. ' +
      'RENT_AND_MAINTENANCE: rent + maintenance. ' +
      'FULL_MANAGEMENT: all caretaker actions.',
    example: ManagementScope.FULL_MANAGEMENT,
  })
  @IsEnum(ManagementScope)
  scope: ManagementScope;

  @ApiProperty({
    description: 'ISO 8601 date when the agreement becomes effective',
    example: '2026-08-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    required: false,
    description: 'ISO 8601 date when the agreement expires (null = open-ended)',
    example: '2027-07-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description:
      'Management fee value. Interpreted as a percentage or flat amount based on feeType.',
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  managementFee: number;

  @ApiProperty({
    required: false,
    enum: ['PERCENTAGE', 'FLAT'],
    default: 'PERCENTAGE',
    description: 'PERCENTAGE of rent collected, or FLAT monthly fee.',
    example: 'PERCENTAGE',
  })
  @IsOptional()
  @IsIn(['PERCENTAGE', 'FLAT'])
  feeType?: string;

  @ApiProperty({
    required: false,
    description: 'Free-text notes or additional clauses',
    example:
      'Caretaker must provide monthly statements by the 5th of each month.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'The assigned Caretaker ID',
    example: 'user-uuid',
  })
  @IsString()
  caretakerId: string;

  @ApiProperty({
    description: 'Duration of the agreement in months',
    example: 12,
  })
  @IsNumber()
  @IsPositive()
  durationMonths: number;

  @ApiProperty({
    description: 'SLA target days for rent collection',
    example: 3,
  })
  @IsNumber()
  @IsPositive()
  slaTargetDaysRent: number;

  @ApiProperty({
    description: 'SLA target days for maintenance resolution',
    example: 2,
  })
  @IsNumber()
  @IsPositive()
  slaTargetDaysMaintenance: number;
}
