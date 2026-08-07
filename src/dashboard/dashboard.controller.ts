import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('user')
  @Roles('USER')
  @ApiOperation({ summary: 'Get User Dashboard' })
  getUserDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getUserDashboard(user.userId);
  }

  @Get('agent')
  @Roles('AGENT', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Agent Dashboard' })
  getAgentDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getAgentDashboard(user.userId);
  }

  @Get('admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Admin Dashboard' })
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('landlord')
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Landlord Dashboard' })
  getLandlordDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getLandlordDashboard(user.userId);
  }

  @Get('caretaker')
  @Roles('CARETAKER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Caretaker Dashboard' })
  getCaretakerDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getCaretakerDashboard(user.userId);
  }

  @Get('tenant')
  @Roles('TENANT')
  @ApiOperation({ summary: 'Get Tenant Dashboard' })
  getTenantDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getTenantDashboard(user.userId);
  }
}
