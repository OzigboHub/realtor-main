import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUsersDto } from 'src/auth/dto/update-auth.dto';
import { Status } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: UpdateUsersDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async blockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
  }

  async unblockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });
  }

  async approveAgent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: Status.APPROVED, isApproved: true } as any,
    });
  }

  async rejectAgent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: Status.REJECTED, isApproved: false } as any,
    });
  }

  async inviteSupportAgent(adminId: string, email: string, name?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only System Admins and Admins can invite support staff',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.role === 'SUPPORT_AGENT') {
      throw new ForbiddenException(
        'User is already registered as a Support Agent',
      );
    }

    const token = `SUP-INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.supportInvitation.create({
      data: {
        email,
        name,
        token,
        invitedById: adminId,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/auth/support-invite?token=${token}`;

    return {
      message: `Support Agent invitation created and sent to ${email}`,
      inviteLink,
      invite,
    };
  }

  async verifySupportInvite(token: string) {
    const invite = await this.prisma.supportInvitation.findUnique({
      where: { token },
      include: { invitedBy: { select: { name: true, email: true } } },
    });

    if (!invite)
      throw new NotFoundException(
        'Invalid or expired support invitation token',
      );
    if (invite.status !== 'PENDING')
      throw new ForbiddenException(
        'This support invitation has already been accepted',
      );
    if (new Date() > invite.expiresAt)
      throw new ForbiddenException('This support invitation link has expired');

    return invite;
  }

  async acceptSupportInvite(dto: {
    token: string;
    name: string;
    password: string;
    phone?: string;
    bio?: string;
  }) {
    const invite = await this.verifySupportInvite(dto.token);

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name || invite.name || 'Support Agent',
        email: invite.email,
        password: hashedPassword,
        role: 'SUPPORT_AGENT',
        status: Status.APPROVED,
        phone: dto.phone,
        bio: dto.bio || 'Official Platform Support & Dispute Mediator',
      },
    });

    await this.prisma.supportInvitation.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    return {
      message:
        'Support agent profile created successfully! You can now log in.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  async listSupportAgents() {
    const agents = await this.prisma.user.findMany({
      where: { role: 'SUPPORT_AGENT' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        status: true,
        phone: true,
        createdAt: true,
      },
    });

    const invitations = await this.prisma.supportInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { name: true, email: true } } },
    });

    return { agents, invitations };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
