import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  @IsNotEmpty()
  status: DisputeStatus; // RESOLVED or DISMISSED

  @IsString()
  @IsNotEmpty()
  resolution: string;

  @IsOptional()
  @IsString()
  actionItem?: string; // e.g. "REFUND_DEPOSIT", "TERMINATE_LEASE", "ENFORCE_REPAIR"
}
