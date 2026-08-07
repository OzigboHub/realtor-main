import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles('TENANT')
  @ApiOperation({ summary: 'Submit a new maintenance request' })
  createRequest(@CurrentUser() user: any, @Body() data: CreateMaintenanceRequestDto) {
    return this.maintenanceService.createRequest(user.id, data);
  }

  @Get('unit/:unitId')
  @Roles('TENANT', 'CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get maintenance requests for a specific unit' })
  getRequestsByUnit(@Param('unitId') unitId: string, @CurrentUser() user: any) {
    return this.maintenanceService.getRequestsByUnit(unitId, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update maintenance request status' })
  updateRequestStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: UpdateMaintenanceStatusDto
  ) {
    return this.maintenanceService.updateRequestStatus(id, user.id, data);
  }
}
