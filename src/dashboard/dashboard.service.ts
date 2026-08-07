import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getUserDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [totalFavorites, totalAppointments, totalMessages] = await Promise.all([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.appointment.count({ where: { userId } }),
      this.prisma.message.count({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    ]);

    return {
      role: 'USER',
      totalFavorites,
      totalAppointments,
      totalMessages,
    };
  }

  async getAgentDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [totalProperties, totalAppointments, totalReviews, totalMessages] = await Promise.all([
      this.prisma.property.count({ where: { agentId: userId } }),
      this.prisma.appointment.count({ where: { property: { agentId: userId } } }),
      this.prisma.review.count({ where: { property: { agentId: userId } } }),
      this.prisma.message.count({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    ]);

    return {
      role: 'AGENT',
      totalProperties,
      totalAppointments,
      totalReviews,
      totalMessages,
    };
  }

  async getAdminDashboard() {
    const [totalUsers, pendingAgents, totalProperties, totalAppointments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'AGENT', status: 'PENDING' } }),
      this.prisma.property.count(),
      this.prisma.appointment.count(),
    ]);

    return {
      role: 'ADMIN',
      totalUsers,
      pendingAgents,
      totalProperties,
      totalAppointments,
    };
  }

  async getLandlordDashboard(userId: string) {
    const [totalBuildings, totalUnits, occupiedUnits, openMaintenance, overdueRent] = await Promise.all([
      this.prisma.building.count({ where: { landlordId: userId } }),
      this.prisma.unit.count({ where: { building: { landlordId: userId } } }),
      this.prisma.unit.count({ where: { building: { landlordId: userId }, isOccupied: true } }),
      this.prisma.maintenanceRequest.count({ where: { unit: { building: { landlordId: userId } }, status: 'OPEN' } }),
      this.prisma.rentPayment.count({ where: { lease: { unit: { building: { landlordId: userId } } }, status: 'OVERDUE' } }),
    ]);

    return {
      role: 'LANDLORD',
      totalBuildings,
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      openMaintenance,
      overdueRent,
    };
  }

  async getCaretakerDashboard(userId: string) {
    const [managedBuildings, openMaintenance, pendingRent, overdueRent] = await Promise.all([
      this.prisma.building.count({ where: { caretakerId: userId } }),
      this.prisma.maintenanceRequest.count({ where: { unit: { building: { caretakerId: userId } }, status: 'OPEN' } }),
      this.prisma.rentPayment.count({ where: { lease: { unit: { building: { caretakerId: userId } } }, status: 'PENDING' } }),
      this.prisma.rentPayment.count({ where: { lease: { unit: { building: { caretakerId: userId } } }, status: 'OVERDUE' } }),
    ]);

    return {
      role: 'CARETAKER',
      managedBuildings,
      openMaintenance,
      pendingRent,
      overdueRent,
    };
  }

  async getTenantDashboard(userId: string) {
    const activeLease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, status: 'ACTIVE' },
      include: { unit: { include: { building: true } } },
    });

    if (!activeLease) {
      return { role: 'TENANT', hasActiveLease: false };
    }

    const [nextPayment, openMaintenance] = await Promise.all([
      this.prisma.rentPayment.findFirst({
        where: { leaseId: activeLease.id, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.maintenanceRequest.count({
        where: { tenantId: userId, status: 'OPEN' },
      }),
    ]);

    return {
      role: 'TENANT',
      hasActiveLease: true,
      activeLease,
      nextPayment,
      openMaintenance,
    };
  }
}
