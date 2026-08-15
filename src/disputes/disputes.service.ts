import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDispute(userId: string, dto: CreateDisputeDto) {
    if (userId === dto.respondentId) {
      throw new BadRequestException('You cannot file a dispute ticket against yourself');
    }

    const respondent = await this.prisma.user.findUnique({ where: { id: dto.respondentId } });
    if (!respondent) throw new NotFoundException('Respondent user not found');

    const ticketNumber = `DISP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 48-Hour Respondent Counter-Evidence Window
    const respondentDeadline = new Date();
    respondentDeadline.setHours(respondentDeadline.getHours() + 48);

    const dispute = await this.prisma.dispute.create({
      data: {
        ticketNumber,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        initiatorId: userId,
        respondentId: dto.respondentId,
        propertyId: dto.propertyId || null,
        leaseId: dto.leaseId || null,
        respondentDeadline,
        status: DisputeStatus.OPEN,
        evidences: dto.evidenceUrls?.length
          ? {
              create: dto.evidenceUrls.map((url) => ({
                uploadedById: userId,
                fileUrl: url,
                fileType: url.endsWith('.pdf') ? 'PDF' : 'IMAGE',
                caption: 'Initial Claim Evidence Attachment',
              })),
            }
          : undefined,
      },
      include: {
        initiator: { select: { id: true, name: true, email: true, role: true } },
        respondent: { select: { id: true, name: true, email: true, role: true } },
        evidences: true,
      },
    });

    return dispute;
  }

  async getDisputes(userId: string, userRole: string, status?: DisputeStatus) {
    const where: any = {};
    if (status) where.status = status;

    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT_AGENT') {
      // Support Agents and Admins see all platform disputes or assigned disputes
    } else {
      // Users see disputes where they are initiator or respondent
      where.OR = [{ initiatorId: userId }, { respondentId: userId }];
    }

    return this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        initiator: { select: { id: true, name: true, email: true, role: true } },
        respondent: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        evidences: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async getDisputeById(disputeId: string, userId: string, userRole: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        initiator: { select: { id: true, name: true, email: true, role: true, phone: true } },
        respondent: { select: { id: true, name: true, email: true, role: true, phone: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, location: true, price: true } },
        lease: { select: { id: true, rentAmount: true, status: true, startDate: true } },
        evidences: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute ticket not found');

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT'].includes(userRole);
    if (!isStaff && dispute.initiatorId !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException('You do not have permission to view this dispute ticket');
    }

    // Filter out internal support notes for regular users
    if (!isStaff) {
      dispute.messages = dispute.messages.filter((m) => !m.isInternalSupportNote);
    }

    return dispute;
  }

  async submitEvidence(disputeId: string, userId: string, dto: { fileUrl: string; fileType?: string; caption?: string }) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute ticket not found');

    const evidence = await this.prisma.disputeEvidence.create({
      data: {
        disputeId,
        uploadedById: userId,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType || (dto.fileUrl.endsWith('.pdf') ? 'PDF' : 'IMAGE'),
        caption: dto.caption || 'Supporting Evidence',
      },
    });

    // Update status to UNDER_REVIEW if respondent uploaded counter-evidence
    if (dispute.status === DisputeStatus.OPEN && userId === dispute.respondentId) {
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: { status: DisputeStatus.UNDER_REVIEW },
      });
    }

    return evidence;
  }

  async addMessage(disputeId: string, userId: string, userRole: string, dto: { message: string; isInternalSupportNote?: boolean }) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute ticket not found');

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT'].includes(userRole);
    if (!isStaff && dispute.initiatorId !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException('You are not authorized to post on this dispute ticket');
    }

    return this.prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: userId,
        message: dto.message,
        isInternalSupportNote: isStaff ? Boolean(dto.isInternalSupportNote) : false,
      },
    });
  }

  async assignMediator(disputeId: string, supportAgentId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute ticket not found');

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        assignedToId: supportAgentId,
        status: DisputeStatus.UNDER_REVIEW,
      },
    });
  }

  async resolveDispute(disputeId: string, supportAgentId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute ticket not found');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: new Date(),
        assignedToId: supportAgentId,
      },
    });

    // Enforce linked entity status updates if applicable
    if (dto.actionItem === 'TERMINATE_LEASE' && dispute.leaseId) {
      await this.prisma.lease.update({
        where: { id: dispute.leaseId },
        data: { status: 'TERMINATED' },
      });
    }

    return updated;
  }
}
