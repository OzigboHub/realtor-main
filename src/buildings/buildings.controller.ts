import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { InviteCaretakerDto } from './dto/invite-caretaker.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Register a new building' })
  createBuilding(@CurrentUser() user: any, @Body() data: CreateBuildingDto) {
    return this.buildingsService.createBuilding(user.id, data);
  }

  @Get()
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all buildings for landlord' })
  getLandlordBuildings(@CurrentUser() user: any) {
    return this.buildingsService.getLandlordBuildings(user.id);
  }

  @Get(':id')
  @Roles('LANDLORD', 'CARETAKER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get building by ID' })
  getBuildingById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.buildingsService.getBuildingById(id, user.id, user.role);
  }

  @Post(':id/invitations')
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Invite a caretaker to manage the building' })
  inviteCaretaker(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: InviteCaretakerDto
  ) {
    return this.buildingsService.inviteCaretaker(id, user.id, data);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a caretaker invitation (must be logged in)' })
  acceptInvitation(@Query('token') token: string, @CurrentUser() user: any) {
    return this.buildingsService.acceptInvitation(token, user.id);
  }

  @Delete(':id/caretaker')
  @Roles('LANDLORD', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove a caretaker from a building' })
  removeCaretaker(@Param('id') id: string, @CurrentUser() user: any) {
    return this.buildingsService.removeCaretaker(id, user.id);
  }
}
