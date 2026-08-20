import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { RenewLeaseDto } from './dto/renew-lease.dto';

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async createLease(creatorId: string, data: CreateLeaseDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: data.unitId },
      include: { building: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const lease = await this.prisma.lease.create({
      data: {
        unitId: data.unitId,
        tenantId: data.tenantId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        rentAmount: data.rentAmount,
        rentFrequency: (data.rentFrequency as any) || 'MONTHLY',
      },
    });

    await this.prisma.unit.update({
      where: { id: data.unitId },
      data: { isOccupied: true },
    });

    await this.prisma.user.update({
      where: { id: data.tenantId },
      data: { role: 'TENANT' },
    });

    return lease;
  }

  async getTenantLease(tenantId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        unit: {
          include: {
            building: true,
          },
        },
        rentPayments: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('No active lease found for this tenant');
    }

    return lease;
  }

  async signLease(
    leaseId: string,
    userId: string,
    signature: string,
    roleType: 'TENANT' | 'LANDLORD',
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) throw new NotFoundException('Lease agreement not found');

    const updateData: any = { signedAt: new Date() };
    if (roleType === 'TENANT') {
      updateData.tenantSignature = signature;
    } else {
      updateData.landlordSignature = signature;
    }

    return this.prisma.lease.update({
      where: { id: leaseId },
      data: updateData,
    });
  }

  async offboardTenant(leaseId: string, actorId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    const updatedLease = await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'TERMINATED' },
    });

    await this.prisma.unit.update({
      where: { id: lease.unitId },
      data: { isOccupied: false },
    });

    const activeLeases = await this.prisma.lease.count({
      where: { tenantId: lease.tenantId, status: 'ACTIVE' },
    });

    if (activeLeases === 0) {
      await this.prisma.user.update({
        where: { id: lease.tenantId },
        data: { role: 'USER' },
      });
    }

    return updatedLease;
  }

  async renewLease(
    id: string,
    userId: string,
    role: string,
    data: RenewLeaseDto,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { building: true } } },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (role === 'TENANT' && lease.tenantId !== userId) {
      throw new ForbiddenException(
        'You can only request renewal for your own lease',
      );
    }

    const updateData: any = {};
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.rentAmount) updateData.rentAmount = data.rentAmount;
    if ((data as any).status) updateData.status = (data as any).status;

    return this.prisma.lease.update({
      where: { id },
      data: updateData,
    });
  }

  async logPayment(leaseId: string, actorId: string, status: string) {
    const payment = await this.prisma.rentPayment.findFirst({
      where: { leaseId, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
    });

    if (payment) {
      return this.prisma.rentPayment.update({
        where: { id: payment.id },
        data: {
          status: status as any,
          paidDate: status === 'PAID' ? new Date() : null,
        },
      });
    }

    return { message: 'No pending payment found for this lease', leaseId };
  }
}
