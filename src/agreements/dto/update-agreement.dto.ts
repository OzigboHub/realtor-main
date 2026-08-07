import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ManagementAgreementStatus } from '@prisma/client';
import { CreateAgreementDto } from './create-agreement.dto';

export class UpdateAgreementDto extends PartialType(CreateAgreementDto) {
  @ApiProperty({
    required: false,
    enum: ManagementAgreementStatus,
    description: 'Manually override agreement status (e.g. EXPIRED, TERMINATED)',
  })
  @IsOptional()
  @IsEnum(ManagementAgreementStatus)
  status?: ManagementAgreementStatus;
}