import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUsersDto } from 'src/auth/dto/update-auth.dto';

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
      select: { id: true, name: true, email: true, role: true, isBlocked: true, status: true, createdAt: true },
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
    if (!user || user.role !== 'AGENT')
      throw new ForbiddenException('Only agents can be approved');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isApproved: true } as any,
    });
  }

  async rejectAgent(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isApproved: false } as any,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
