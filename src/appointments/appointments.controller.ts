import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/current-user.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Roles } from 'src/common/roles.decorators';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a visit' })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.appointmentsService.create(userId, createAppointmentDto);
  }

  @Get('available-slots')
  @ApiOperation({
    summary: 'Get available time slots for property viewing calendar',
  })
  getAvailableSlots(
    @Query('propertyId') propertyId: string,
    @Query('date') date?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(propertyId, date);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments for logged-in user/agent' })
  findAll(@CurrentUser() user: any) {
    const userId = user.id || user.userId || user.sub;
    return this.appointmentsService.findAll(userId, user.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update appointment status (Agent/Admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.id || user.userId || user.sub;
    return this.appointmentsService.updateStatus(
      id,
      userId,
      user.role,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel appointment' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user.id || user.userId || user.sub;
    return this.appointmentsService.remove(id, userId, user.role);
  }
}
