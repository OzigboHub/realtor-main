import { IsEnum, IsNotEmpty } from 'class-validator';
import { RentStatus } from '@prisma/client';

export class UpdateRentPaymentStatusDto {
  @IsEnum(RentStatus)
  @IsNotEmpty()
  status: RentStatus;
}
