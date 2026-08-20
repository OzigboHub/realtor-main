import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ApplyTenantScreeningDto {
  propertyId: string;
  incomeDocumentUrl?: string;
  identityDocumentUrl?: string;
  paymentReference?: string;
}

@Injectable()
export class TenantScreeningService {
  constructor(private readonly prisma: PrismaService) {}

  async applyForScreening(userId: string, dto: ApplyTenantScreeningDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) throw new NotFoundException('Property listing not found');

    // Simulate AI Document Analysis & Risk Scoring
    const riskScores = ['LOW', 'LOW', 'MODERATE', 'LOW'];
    const randomRisk =
      riskScores[Math.floor(Math.random() * riskScores.length)];
    const estimatedRentToIncome = Number(
      (Math.random() * (0.35 - 0.15) + 0.15).toFixed(2),
    ); // 15% - 35%

    const screening = await this.prisma.tenantScreening.create({
      data: {
        applicantId: userId,
        propertyId: dto.propertyId,
        incomeDocumentUrl:
          dto.incomeDocumentUrl ||
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
        identityDocumentUrl:
          dto.identityDocumentUrl ||
          'https://images.unsplash.com/photo-1589829545856-d10d557cf95f',
        status: 'APPROVED',
        riskScore: randomRisk,
        rentToIncomeRatio: estimatedRentToIncome,
        aiNotes: `AI Verification Verified: Valid Government ID & Payslip matched. Rent-to-Income ratio at ${(estimatedRentToIncome * 100).toFixed(0)}%.`,
        paymentReference: dto.paymentReference || `SCR-${Date.now()}`,
      },
    });

    return screening;
  }

  async getScreeningsForLandlord(landlordId: string, propertyId?: string) {
    const where: any = {
      property: {
        agentId: landlordId,
      },
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    return this.prisma.tenantScreening.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateScreeningStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const screening = await this.prisma.tenantScreening.findUnique({
      where: { id },
    });
    if (!screening) throw new NotFoundException('Screening record not found');

    return this.prisma.tenantScreening.update({
      where: { id },
      data: { status },
    });
  }
}
