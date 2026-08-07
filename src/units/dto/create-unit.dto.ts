import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @IsInt()
  @IsOptional()
  bedrooms?: number;

  @IsInt()
  @IsOptional()
  bathrooms?: number;
}
