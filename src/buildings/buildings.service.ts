import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { InviteCaretakerDto } from './dto/invite-caretaker.dto';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBuilding(landlordId: string, data: CreateBuildingDto) {
    return this.prisma.building.create({
      data: {
        ...data,
        landlordId,
      },
    });
  }

  async getLandlordBuildings(landlordId: string) {
    return this.prisma.building.findMany({
      where: { landlordId },
      include: {
        caretaker: { select: { id: true, name: true, email: true } },
        _count: { select: { units: true } },
      },
    });
  }

  async getBuildingById(id: string, userId: string, role: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        units: true,
        caretaker: { select: { id: true, name: true, email: true } },
      },
    });
    if (!building) throw new NotFoundException('Building not found');

    if (role === Role.LANDLORD && building.landlordId !== userId) {
      throw new ForbiddenException('You do not own this building');
    }
    if (role === Role.CARETAKER && building.caretakerId !== userId) {
      throw new ForbiddenException('You do not manage this building');
    }

    return building;
  }

  async inviteCaretaker(
    buildingId: string,
    landlordId: string,
    data: InviteCaretakerDto,
  ) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException('Building not found');
    if (building.landlordId !== landlordId)
      throw new ForbiddenException('Not your building');

    const token = randomBytes(32).toString('hex');

    const invitation = await this.prisma.buildingInvitation.create({
      data: {
        buildingId,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
        token,
      },
    });

    // In a real application, you would send an email or WhatsApp message here.
    const inviteLink = `http://localhost:3000/api/v1/buildings/invitations/accept?token=${token}`;

    return {
      message: 'Invitation generated successfully',
      inviteLink,
      invitation,
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.buildingInvitation.findUnique({
      where: { token },
    });
    if (!invitation)
      throw new NotFoundException('Invalid or expired invitation token');
    if (invitation.status === 'ACCEPTED')
      throw new BadRequestException('Invitation already accepted');

    // Assign caretaker to building
    await this.prisma.building.update({
      where: { id: invitation.buildingId },
      data: { caretakerId: userId },
    });

    // Mark invitation as accepted
    await this.prisma.buildingInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    // Upgrade user role to CARETAKER if they are just a USER
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role === Role.USER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.CARETAKER },
      });
    }

    return { message: 'You are now the caretaker for this building' };
  }

  async removeCaretaker(buildingId: string, landlordId: string) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) throw new NotFoundException('Building not found');
    if (building.landlordId !== landlordId)
      throw new ForbiddenException('Not your building');

    await this.prisma.building.update({
      where: { id: buildingId },
      data: { caretakerId: null },
    });

    return { message: 'Caretaker removed successfully' };
  }
}
