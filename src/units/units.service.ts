import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async createUnit(
    buildingId: string,
    userId: string,
    role: string,
    data: CreateUnitDto,
  ) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException('Building not found');

    if (role === Role.LANDLORD && building.landlordId !== userId) {
      throw new ForbiddenException('You do not own this building');
    }
    if (role === Role.CARETAKER && building.caretakerId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.unit.create({
      data: {
        ...data,
        buildingId,
      },
    });
  }

  async getUnitsByBuilding(buildingId: string, userId: string, role: string) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException('Building not found');

    if (role === Role.LANDLORD && building.landlordId !== userId) {
      throw new ForbiddenException('You do not own this building');
    }
    if (role === Role.CARETAKER && building.caretakerId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return this.prisma.unit.findMany({
      where: { buildingId },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }
}
