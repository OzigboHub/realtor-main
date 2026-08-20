import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, propertyId: string) {
    // Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');

    // Check if favorite already exists
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (existing) throw new ConflictException('Property already in favorites');

    return this.prisma.favorite.create({
      data: { userId, propertyId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, propertyId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (!existing) throw new NotFoundException('Favorite not found');

    await this.prisma.favorite.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return { success: true };
  }
}
