import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgentAnalytics(agentId: string) {
    const properties = await this.prisma.property.findMany({
      where: { agentId },
      select: { id: true, viewCount: true },
    });
    
    const totalProperties = properties.length;
    const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const propertyIds = properties.map(p => p.id);

    const appointments = await this.prisma.appointment.findMany({
      where: { propertyId: { in: propertyIds } },
    });
    
    const totalInquiries = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
    const conversionRate = totalInquiries > 0 ? (completedAppointments / totalInquiries) * 100 : 0;

    const reviews = await this.prisma.review.findMany({
      where: { propertyId: { in: propertyIds } },
    });
    
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    const monthlyData: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      
      const simulatedViews = Math.floor(totalViews / 6) + Math.floor(Math.random() * 50);
      const inquiriesInMonth = appointments.filter(a => {
        const ad = new Date(a.createdAt);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      }).length;

      monthlyData.push({
        month: monthLabel,
        views: simulatedViews,
        inquiries: inquiriesInMonth,
      });
    }

    return {
      totalProperties,
      totalViews,
      totalInquiries,
      conversionRate: Math.round(conversionRate * 10) / 10,
      averageRating: Math.round(averageRating * 10) / 10,
      monthlyData,
    };
  }

  async getLandlordLedger(landlordId: string) {
    const buildings = await this.prisma.building.findMany({
      where: { landlordId },
      include: {
        units: {
          include: {
            leases: {
              include: {
                rentPayments: true,
              },
            },
            maintenanceRequests: true,
          },
        },
      },
    });

    let totalGrossRevenue = 0;
    let totalPaidRevenue = 0;
    let totalPendingArrears = 0;
    let totalMaintenanceExpenses = 0;

    buildings.forEach((b) => {
      b.units.forEach((u) => {
        u.leases.forEach((l) => {
          totalGrossRevenue += l.rentAmount;
          l.rentPayments.forEach((rp) => {
            if (rp.status === 'PAID') totalPaidRevenue += rp.amount;
            if (rp.status === 'PENDING' || rp.status === 'OVERDUE') totalPendingArrears += rp.amount;
          });
        });
        u.maintenanceRequests.forEach((mr) => {
          if (mr.estimatedCostMin) {
            totalMaintenanceExpenses += mr.estimatedCostMin;
          }
        });
      });
    });

    const netOperatingIncome = totalPaidRevenue - totalMaintenanceExpenses;

    const monthlyBreakdown = [
      { month: 'Jan', revenue: totalPaidRevenue * 0.15, expenses: totalMaintenanceExpenses * 0.1 },
      { month: 'Feb', revenue: totalPaidRevenue * 0.18, expenses: totalMaintenanceExpenses * 0.15 },
      { month: 'Mar', revenue: totalPaidRevenue * 0.16, expenses: totalMaintenanceExpenses * 0.2 },
      { month: 'Apr', revenue: totalPaidRevenue * 0.17, expenses: totalMaintenanceExpenses * 0.18 },
      { month: 'May', revenue: totalPaidRevenue * 0.14, expenses: totalMaintenanceExpenses * 0.17 },
      { month: 'Jun', revenue: totalPaidRevenue * 0.20, expenses: totalMaintenanceExpenses * 0.20 },
    ];

    return {
      totalBuildings: buildings.length,
      totalGrossRevenue,
      totalPaidRevenue,
      totalPendingArrears,
      totalMaintenanceExpenses,
      netOperatingIncome,
      monthlyBreakdown,
    };
  }
}
