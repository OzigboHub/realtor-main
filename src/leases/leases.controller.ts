import { Controller, Get, Post, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Onboard a tenant (create lease)' })
  createLease(@CurrentUser() user: any, @Body() data: CreateLeaseDto) {
    return this.leasesService.createLease(user.id, data);
  }

  @Get('my-lease')
  @Roles('TENANT')
  @ApiOperation({ summary: 'Get active lease details for the tenant' })
  getTenantLease(@CurrentUser() user: any) {
    return this.leasesService.getTenantLease(user.id);
  }

  @Delete(':id/offboard')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Offboard a tenant (terminate lease)' })
  offboardTenant(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leasesService.offboardTenant(id, user.id);
  }

  @Post(':id/renew')
  @Roles('TENANT', 'CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Renew a lease (Tenant can extend their own, Caretaker/Landlord can update terms)' })
  renewLease(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: import('./dto/renew-lease.dto').RenewLeaseDto
  ) {
    return this.leasesService.renewLease(id, user.id, user.role, data);
  }
}
