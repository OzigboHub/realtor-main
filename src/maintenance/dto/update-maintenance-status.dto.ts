import { IsEnum, IsNotEmpty } from 'class-validator';
import { MaintenanceStatus } from '@prisma/client';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  @IsNotEmpty()
  status: MaintenanceStatus;
}
