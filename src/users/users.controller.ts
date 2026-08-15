import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';
import { CurrentUser } from 'src/common/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  getUserById(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Patch(':id/block')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Block a user' })
  blockUser(@Param('id') id: string) {
    return this.usersService.blockUser(id);
  }

  @Patch(':id/unblock')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Unblock a user' })
  unblockUser(@Param('id') id: string) {
    return this.usersService.unblockUser(id);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve agent registration' })
  approveAgent(@Param('id') id: string) {
    return this.usersService.approveAgent(id);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reject agent registration' })
  rejectAgent(@Param('id') id: string) {
    return this.usersService.rejectAgent(id);
  }

  @Post('support/invite')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Invite a new Support Agent (Admin & Super Admin only)' })
  inviteSupportAgent(@CurrentUser() user: any, @Body() body: { email: string; name?: string }) {
    return this.usersService.inviteSupportAgent(user.userId, body.email, body.name);
  }

  @Get('support/agents')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all Support Agents and Invitations (Admin only)' })
  listSupportAgents() {
    return this.usersService.listSupportAgents();
  }

  @Get('support/verify-invite')
  @ApiOperation({ summary: 'Verify support invitation token' })
  verifySupportInvite(@Query('token') token: string) {
    return this.usersService.verifySupportInvite(token);
  }

  @Post('support/accept-invite')
  @ApiOperation({ summary: 'Accept support invitation and complete onboarding' })
  acceptSupportInvite(@Body() dto: { token: string; name: string; password: string; phone?: string; bio?: string }) {
    return this.usersService.acceptSupportInvite(dto);
  }
}
