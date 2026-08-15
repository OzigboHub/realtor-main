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
  createRequest(
    @CurrentUser() user: any,
    @Body() data: CreateMaintenanceRequestDto & { imageUrl?: string },
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.maintenanceService.createRequest(userId, data);
  }

  @Get('unit/:unitId')
  @Roles('TENANT', 'CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get maintenance requests for a specific unit' })
  getRequestsByUnit(@Param('unitId') unitId: string, @CurrentUser() user: any) {
    const userId = user.id || user.userId || user.sub;
    return this.maintenanceService.getRequestsByUnit(unitId, userId, user.role);
  }

  @Patch(':id/assign-contractor')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign maintenance repair contractor' })
  assignContractor(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { contractorName: string; contractorPhone: string },
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.maintenanceService.assignContractor(id, userId, data.contractorName, data.contractorPhone);
  }

  @Patch(':id/status')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update maintenance request status' })
  updateRequestStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: UpdateMaintenanceStatusDto
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.maintenanceService.updateRequestStatus(id, userId, data);
  }
}
