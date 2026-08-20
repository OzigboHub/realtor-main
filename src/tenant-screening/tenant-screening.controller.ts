import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  TenantScreeningService,
  ApplyTenantScreeningDto,
} from './tenant-screening.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tenant Screening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant-screening')
export class TenantScreeningController {
  constructor(private readonly screeningService: TenantScreeningService) {}

  @Post('apply')
  @ApiOperation({
    summary: 'Apply for 1-Click AI Tenant Screening & Risk Scoring',
  })
  async apply(@CurrentUser() user: any, @Body() dto: ApplyTenantScreeningDto) {
    const userId = user.id || user.userId || user.sub;
    return this.screeningService.applyForScreening(userId, dto);
  }

  @Get('landlord')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD, Role.CARETAKER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all tenant screening applications for landlord/caretaker',
  })
  async getLandlordScreenings(
    @CurrentUser() user: any,
    @Query('propertyId') propertyId?: string,
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.screeningService.getScreeningsForLandlord(userId, propertyId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.LANDLORD, Role.CARETAKER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or Reject a tenant screening application' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED',
  ) {
    return this.screeningService.updateScreeningStatus(id, status);
  }
}
