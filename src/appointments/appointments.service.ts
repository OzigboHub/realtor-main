import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAppointmentDto: CreateAppointmentDto) {
    const { propertyId, date, message } = createAppointmentDto;
    
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      throw new ConflictException('Appointment date cannot be in the past');
    }

    return this.prisma.appointment.create({
      data: {
        userId,
        propertyId,
        date: appointmentDate,
        message,
      },
    });
  }

  async findAll(userId: string, role: string) {
    // If agent, return appointments for their properties
    if (role === 'AGENT') {
      return this.prisma.appointment.findMany({
        where: { property: { agentId: userId } },
        include: { user: { select: { id: true, name: true, email: true, phone: true } }, property: true },
        orderBy: { date: 'asc' },
      });
    }

    // If Admin/Super Admin, return all
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return this.prisma.appointment.findMany({
        include: { user: { select: { id: true, name: true } }, property: true },
        orderBy: { date: 'asc' },
      });
    }

    // Normal user, return their appointments
    return this.prisma.appointment.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { date: 'asc' },
    });
  }

  async updateStatus(id: string, userId: string, role: string, updateDto: UpdateAppointmentStatusDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { property: true }
    });
    
    if (!appointment) throw new NotFoundException('Appointment not found');

    // Only Admin or the Agent who owns the property can update the status
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && appointment.property.agentId !== userId) {
      throw new ForbiddenException('Only the property agent or an admin can update the status');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: updateDto.status },
    });
  }

  async remove(id: string, userId: string, role: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    // User can cancel their own, Admin can delete any
    if (appointment.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You can only cancel your own appointments');
    }

    await this.prisma.appointment.delete({ where: { id } });
    return { success: true };
  }
}
