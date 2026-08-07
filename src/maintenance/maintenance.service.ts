import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { Role } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(tenantId: string, data: CreateMaintenanceRequestDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { unitId: data.unitId, tenantId, status: 'ACTIVE' },
    });

    if (!lease) throw new ForbiddenException('You do not have an active lease for this unit');

    return this.prisma.maintenanceRequest.create({
      data: {
        unitId: data.unitId,
        tenantId,
        description: data.description,
      }
    });
  }

  async getRequestsByUnit(unitId: string, userId: string, role: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { building: true, leases: { where: { status: 'ACTIVE' } } }
    });
    if (!unit) throw new NotFoundException('Unit not found');

    if (role === Role.LANDLORD && unit.building.landlordId !== userId) {
      throw new ForbiddenException('You do not own this building');
    }
    if (role === Role.CARETAKER && unit.building.caretakerId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }
    if (role === Role.TENANT) {
      const isTenant = unit.leases.some(l => l.tenantId === userId);
      if (!isTenant) throw new ForbiddenException('You do not lease this unit');
    }

    return this.prisma.maintenanceRequest.findMany({
      where: { unitId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateRequestStatus(requestId: string, userId: string, data: UpdateMaintenanceStatusDto) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { unit: { include: { building: true } } }
    });

    if (!request) throw new NotFoundException('Maintenance request not found');

    if (request.unit.building.caretakerId !== userId && request.unit.building.landlordId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: data.status }
    });
  }
}
