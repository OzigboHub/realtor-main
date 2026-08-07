import { IsDateString, IsOptional, IsNumber } from 'class-validator';

export class RenewLeaseDto {
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  rentAmount?: number;
}
