import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { ManagementAgreementStatus, ManagementScope } from '@prisma/client';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  // FR-12.1: Create a Management Agreement
  async create(buildingId: string, landlordId: string, dto: CreateAgreementDto) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException('Building not found');
    if (building.landlordId !== landlordId)
      throw new ForbiddenException('You do not own this building');

    // Auto-terminate any current ACTIVE agreement
    await this.prisma.managementAgreement.updateMany({
      where: { buildingId, status: ManagementAgreementStatus.ACTIVE },
      data: { status: ManagementAgreementStatus.TERMINATED },
    });

    return this.prisma.managementAgreement.create({
      data: {
        buildingId,
        scope: dto.scope,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        managementFee: dto.managementFee,
        feeType: dto.feeType ?? 'PERCENTAGE',
        notes: dto.notes,
        status: ManagementAgreementStatus.ACTIVE,
      },
    });
  }

  // FR-12.5: Full agreement history for a building
  async findAllForBuilding(buildingId: string, userId: string, role: string) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException('Building not found');

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && building.landlordId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.managementAgreement.findMany({
      where: { buildingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // FR-12.3: Active agreement (compliance view)
  async findActive(buildingId: string, userId: string, role: string) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException('Building not found');

    const isLandlord = building.landlordId === userId;
    const isCaretaker = building.caretakerId === userId;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isLandlord && !isCaretaker && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const agreement = await this.prisma.managementAgreement.findFirst({
      where: { buildingId, status: ManagementAgreementStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    return agreement ?? { message: 'No active agreement for this building' };
  }

  // FR-12.4: Renew / modify agreement terms
  async update(agreementId: string, landlordId: string, dto: UpdateAgreementDto) {
    const agreement = await this.prisma.managementAgreement.findUnique({
      where: { id: agreementId },
      include: { building: true },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.building.landlordId !== landlordId)
      throw new ForbiddenException('You do not own this building');

    return this.prisma.managementAgreement.update({
      where: { id: agreementId },
      data: {
        ...(dto.scope && { scope: dto.scope }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.managementFee !== undefined && { managementFee: dto.managementFee }),
        ...(dto.feeType && { feeType: dto.feeType }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  // FR-12.4: Terminate agreement
  async terminate(agreementId: string, landlordId: string) {
    const agreement = await this.prisma.managementAgreement.findUnique({
      where: { id: agreementId },
      include: { building: true },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.building.landlordId !== landlordId)
      throw new ForbiddenException('You do not own this building');
    if (agreement.status !== ManagementAgreementStatus.ACTIVE)
      throw new BadRequestException('Only ACTIVE agreements can be terminated');

    return this.prisma.managementAgreement.update({
      where: { id: agreementId },
      data: { status: ManagementAgreementStatus.TERMINATED },
    });
  }

  // FR-12.2: Scope enforcement helper (called by other modules)
  async checkCaretakerScope(
    buildingId: string,
    action: 'RENT' | 'MAINTENANCE' | 'FULL',
  ): Promise<void> {
    const agreement = await this.prisma.managementAgreement.findFirst({
      where: { buildingId, status: ManagementAgreementStatus.ACTIVE },
    });

    if (!agreement) {
      // No agreement - allow all actions (backwards-compatible)
      return;
    }

    const scope = agreement.scope;

    const allowed =
      scope === ManagementScope.FULL_MANAGEMENT ||
      (action === 'RENT' && scope !== null) ||
      (action === 'MAINTENANCE' && scope !== ManagementScope.RENT_COLLECTION);

    if (!allowed) {
      throw new ForbiddenException(
        `Your management agreement (${scope}) does not permit this action.`,
      );
    }
  }
}