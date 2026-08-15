import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { Role } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createRequest(tenantId: string, data: CreateMaintenanceRequestDto & { imageUrl?: string }) {
    const lease = await this.prisma.lease.findFirst({
      where: { unitId: data.unitId, tenantId, status: 'ACTIVE' },
      include: { unit: { include: { building: true } } },
    });

    if (!lease) throw new ForbiddenException('You do not have an active lease for this unit');

    // Simulate AI Repair Cost Benchmark Calculation
    const estMin = Math.floor(Math.random() * (25000 - 10000) + 10000);
    const estMax = estMin + Math.floor(Math.random() * 25000 + 10000);

    const created = await this.prisma.maintenanceRequest.create({
      data: {
        unitId: data.unitId,
        tenantId,
        description: data.description,
        imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
        estimatedCostMin: estMin,
        estimatedCostMax: estMax,
      },
    });

    // Notify assigned caretaker or landlord
    const building = lease.unit?.building;
    const recipientId = building?.caretakerId || building?.landlordId;
    if (recipientId) {
      await this.notifications.create(
        recipientId,
        'MAINTENANCE_LOGGED',
        `New maintenance request logged for ${building?.name || 'Unit'}: "${data.description}"`,
        { ticketId: created.id, unitId: data.unitId },
      );
    }

    return created;
  }

  async getRequestsByUnit(unitId: string, userId: string, role: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { building: true, leases: { where: { status: 'ACTIVE' } } },
    });
    if (!unit) throw new NotFoundException('Unit not found');

    if (role === Role.LANDLORD && unit.building.landlordId !== userId) {
      throw new ForbiddenException('You do not own this building');
    }
    if (role === Role.CARETAKER && unit.building.caretakerId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }
    if (role === Role.TENANT) {
      const isTenant = unit.leases.some((l) => l.tenantId === userId);
      if (!isTenant) throw new ForbiddenException('You do not lease this unit');
    }

    return this.prisma.maintenanceRequest.findMany({
      where: { unitId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignContractor(requestId: string, userId: string, contractorName: string, contractorPhone: string) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { unit: { include: { building: true } } },
    });

    if (!request) throw new NotFoundException('Maintenance request not found');

    return this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'IN_PROGRESS',
        contractorName,
        contractorPhone,
      },
    });
  }

  async updateRequestStatus(requestId: string, userId: string, data: UpdateMaintenanceStatusDto) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { unit: { include: { building: true } } },
    });

    if (!request) throw new NotFoundException('Maintenance request not found');

    if (request.unit.building.caretakerId !== userId && request.unit.building.landlordId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: data.status },
    });

    // Notify tenant of resolution status update
    if (request.tenantId) {
      await this.notifications.create(
        request.tenantId,
        'MAINTENANCE_STATUS_UPDATED',
        `Your maintenance ticket for "${request.description}" is now ${data.status}`,
        { ticketId: requestId, status: data.status },
      );
    }

    return updated;
  }
}
