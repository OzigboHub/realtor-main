import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(userId: string, createAppointmentDto: CreateAppointmentDto) {
    const { propertyId, date, message } = createAppointmentDto;
    
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      throw new ConflictException('Appointment date cannot be in the past');
    }

    const appt = await this.prisma.appointment.create({
      data: {
        userId,
        propertyId,
        date: appointmentDate,
        message,
      },
    });

    // Notify agent of new tour request
    if (property.agentId) {
      await this.notifications.create(
        property.agentId,
        'APPOINTMENT_REQUESTED',
        `New viewing tour request for "${property.title}" on ${appointmentDate.toLocaleDateString()}`,
        { appointmentId: appt.id, propertyId },
      );
    }

    return appt;
  }

  async getAvailableSlots(propertyId: string, dateStr?: string) {
    const defaultSlots = [
      '09:00 AM',
      '10:30 AM',
      '01:00 PM',
      '02:30 PM',
      '04:00 PM',
      '05:30 PM',
    ];

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const booked = await this.prisma.appointment.findMany({
      where: {
        propertyId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const bookedTimes = booked.map((b) => {
      const hours = b.date.getHours();
      const minutes = b.date.getMinutes() === 0 ? '00' : b.date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;
      return `${formattedHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    });

    return defaultSlots.map((slot) => ({
      time: slot,
      available: !bookedTimes.includes(slot),
    }));
  }

  async findAll(userId: string, role: string) {
    if (role === 'AGENT') {
      return this.prisma.appointment.findMany({
        where: { property: { agentId: userId } },
        include: { user: { select: { id: true, name: true, email: true, phone: true } }, property: true },
        orderBy: { date: 'asc' },
      });
    }

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return this.prisma.appointment.findMany({
        include: { user: { select: { id: true, name: true } }, property: true },
        orderBy: { date: 'asc' },
      });
    }

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

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && appointment.property.agentId !== userId) {
      throw new ForbiddenException('Only the property agent or an admin can update the status');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: updateDto.status },
    });

    // Notify user of tour status update
    await this.notifications.create(
      appointment.userId,
      'APPOINTMENT_STATUS_UPDATED',
      `Your viewing tour for "${appointment.property.title}" has been updated to ${updateDto.status}`,
      { appointmentId: id, status: updateDto.status },
    );

    return updated;
  }

  async remove(id: string, userId: string, role: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You can only cancel your own appointments');
    }

    await this.prisma.appointment.delete({ where: { id } });
    return { success: true };
  }
}
