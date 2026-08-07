import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentPaymentDto } from './dto/create-rent-payment.dto';
import { UpdateRentPaymentStatusDto } from './dto/update-rent-payment-status.dto';
import { Role } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(caretakerId: string, data: CreateRentPaymentDto) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: data.leaseId },
      include: { unit: { include: { building: true } } }
    });

    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.unit.building.caretakerId !== caretakerId && lease.unit.building.landlordId !== caretakerId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.rentPayment.create({
      data: {
        leaseId: data.leaseId,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
      }
    });
  }

  async updatePaymentStatus(paymentId: string, caretakerId: string, data: UpdateRentPaymentStatusDto) {
    const payment = await this.prisma.rentPayment.findUnique({
      where: { id: paymentId },
      include: { lease: { include: { unit: { include: { building: true } } } } }
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.lease.unit.building.caretakerId !== caretakerId && payment.lease.unit.building.landlordId !== caretakerId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: data.status,
        paidDate: data.status === 'PAID' ? new Date() : null,
      }
    });
  }

  async getTenantPayments(tenantId: string) {
    return this.prisma.rentPayment.findMany({
      where: { lease: { tenantId } },
      orderBy: { dueDate: 'desc' }
    });
  }
}
