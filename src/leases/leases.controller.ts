import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
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

  // Alias used by frontend tenancy API
  @Get('my')
  @Roles('TENANT')
  @ApiOperation({ summary: 'Alias for my-lease — frontend compatibility' })
  getTenantLeaseAlias(@CurrentUser() user: any) {
    return this.leasesService.getTenantLease(user.id);
  }

  @Patch(':id/payment')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Log a rent payment status update for a lease' })
  logPayment(
    @Param('id') id: string,
    @Body() data: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.leasesService.logPayment(id, user.id, data.status);
  }

  @Patch(':id/sign')
  @ApiOperation({ summary: 'Attach digital signature to tenancy agreement' })
  signLease(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { signature: string; roleType: 'TENANT' | 'LANDLORD' },
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.leasesService.signLease(
      id,
      userId,
      data.signature,
      data.roleType,
    );
  }

  @Delete(':id/offboard')
  @Roles('CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Offboard a tenant (terminate lease)' })
  offboardTenant(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leasesService.offboardTenant(id, user.id);
  }

  @Post(':id/renew')
  @Roles('TENANT', 'CARETAKER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Renew a lease (Tenant can extend their own, Caretaker/Landlord can update terms)',
  })
  renewLease(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: import('./dto/renew-lease.dto').RenewLeaseDto,
  ) {
    return this.leasesService.renewLease(id, user.id, user.role, data);
  }
}
