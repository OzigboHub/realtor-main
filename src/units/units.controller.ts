import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('building/:buildingId')
  @Roles('LANDLORD', 'CARETAKER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new unit in a building' })
  createUnit(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: any,
    @Body() data: CreateUnitDto,
  ) {
    return this.unitsService.createUnit(buildingId, user.id, user.role, data);
  }

  @Get('building/:buildingId')
  @Roles('LANDLORD', 'CARETAKER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all units for a building' })
  getUnitsByBuilding(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: any,
  ) {
    return this.unitsService.getUnitsByBuilding(buildingId, user.id, user.role);
  }
}
