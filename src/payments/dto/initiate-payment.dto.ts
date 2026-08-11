import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Lease ID for rent payment' })
  @IsUUID()
  @IsNotEmpty()
  leaseId: string;

  @ApiProperty({ description: 'Payment amount in NGN/USD', example: 500000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Callback URL after successful payment', required: false })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
