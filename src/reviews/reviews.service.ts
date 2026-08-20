import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    propertyId: string,
    createReviewDto: CreateReviewDto,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const existing = await this.prisma.review.findFirst({
      where: { userId, propertyId },
    });
    if (existing)
      throw new ConflictException('You have already reviewed this property');

    return this.prisma.review.create({
      data: {
        ...createReviewDto,
        userId,
        propertyId,
      },
    });
  }

  async findAllByProperty(propertyId: string) {
    return this.prisma.review.findMany({
      where: { propertyId },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    return this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
    });
  }

  async remove(id: string, userId: string, role: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (
      review.userId !== userId &&
      role !== 'ADMIN' &&
      role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('You are not allowed to delete this review');
    }

    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
