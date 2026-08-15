import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorators';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('agent/:agentId')
  @Roles(Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get analytics for real estate agents' })
  async getAgentAnalytics(@Param('agentId') agentId: string) {
    return this.analyticsService.getAgentAnalytics(agentId);
  }

  @Get('landlord/ledger')
  @Roles(Role.LANDLORD, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get financial ledger analytics for landlord portfolio' })
  async getLandlordLedger(@CurrentUser() user: any) {
    const userId = user.id || user.userId || user.sub;
    return this.analyticsService.getLandlordLedger(userId);
  }
}
