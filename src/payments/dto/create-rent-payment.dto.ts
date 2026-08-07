import { IsString, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';

export class CreateRentPaymentDto {
  @IsString()
  @IsNotEmpty()
  leaseId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}
