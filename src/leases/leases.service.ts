import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async createLease(caretakerId: string, data: CreateLeaseDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: data.unitId },
      include: { building: true },
    });

    if (!unit) throw new NotFoundException('Unit not found');
    if (unit.building.caretakerId !== caretakerId && unit.building.landlordId !== caretakerId) {
      throw new ForbiddenException('You do not manage this building');
    }
    if (unit.isOccupied) throw new BadRequestException('Unit is already occupied');

    // Upgrade user to TENANT if they are just USER
    const tenant = await this.prisma.user.findUnique({ where: { id: data.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant user not found');
    if (tenant.role === Role.USER) {
      await this.prisma.user.update({
        where: { id: data.tenantId },
        data: { role: Role.TENANT },
      });
    }

    // Mark unit as occupied
    await this.prisma.unit.update({
      where: { id: data.unitId },
      data: { isOccupied: true },
    });

    return this.prisma.lease.create({
      data: {
        unitId: data.unitId,
        tenantId: data.tenantId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        rentAmount: data.rentAmount,
      },
    });
  }

  async getTenantLease(tenantId: string) {
    return this.prisma.lease.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        unit: {
          include: { building: true },
        },
      },
    });
  }

  async offboardTenant(leaseId: string, caretakerId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { building: true } } },
    });

    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.unit.building.caretakerId !== caretakerId && lease.unit.building.landlordId !== caretakerId) {
      throw new ForbiddenException('You do not manage this building');
    }

    // Mark lease as TERMINATED
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'TERMINATED' },
    });

    // Free the unit
    await this.prisma.unit.update({
      where: { id: lease.unitId },
      data: { isOccupied: false },
    });

    return { message: 'Tenant offboarded successfully' };
  }

  async renewLease(leaseId: string, userId: string, role: string, data: any) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { building: true } } },
    });

    if (!lease) throw new NotFoundException('Lease not found');

    if (role === Role.TENANT) {
      if (lease.tenantId !== userId) {
        throw new ForbiddenException('You can only renew your own lease');
      }
      // Automatically extend by 1 year if tenant is renewing
      const currentEndDate = lease.endDate || new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      return this.prisma.lease.update({
        where: { id: leaseId },
        data: {
          endDate: newEndDate,
        },
      });
    } else {
      if (lease.unit.building.caretakerId !== userId && lease.unit.building.landlordId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('You do not manage this building');
      }

      return this.prisma.lease.update({
        where: { id: leaseId },
        data: {
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          rentAmount: data.rentAmount !== undefined ? data.rentAmount : undefined,
        },
      });
    }
  }
}
