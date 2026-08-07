import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
