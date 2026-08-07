import { PartialType } from '@nestjs/swagger';
import { RegisterUserDto } from './create-auth.dto';

export class UpdateUsersDto extends PartialType(RegisterUserDto) {}
