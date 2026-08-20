import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  prevValue?: any;
  newValue?: any;
  status?: 'SUCCESS' | 'FAILURE';
  failReason?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({ data: { ...entry } });
  }

  async findAll(
    filters: {
      userId?: string;
      role?: string;
      module?: string;
      action?: string;
      status?: string;
      from?: string;
      to?: string;
      entityType?: string;
    },
    page = 1,
    limit = 50,
  ) {
    const where: any = {};
    if (filters.userId) where.performedBy = filters.userId;
    if (filters.role) where.userRole = filters.role;
    if (filters.module)
      where.module = { contains: filters.module, mode: 'insensitive' };
    if (filters.action)
      where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
