import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'] })
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'])
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';
}
