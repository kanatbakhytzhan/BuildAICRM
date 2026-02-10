import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SystemLogCategory } from '@prisma/client';

@Injectable()
export class SystemLogsService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    tenantId?: string | null;
    category: SystemLogCategory;
    message: string;
    meta?: Prisma.JsonValue | null;
  }) {
    const { tenantId, category, message, meta } = params;
    return this.prisma.systemLog.create({
      data: {
        tenantId: tenantId ?? null,
        category,
        message,
        meta: meta === null ? Prisma.JsonNull : meta,
      },
    });
  }

  async list(params: {
    tenantId?: string;
    category?: SystemLogCategory | 'all';
    search?: string;
    limit?: number;
  }) {
    const where: Prisma.SystemLogWhereInput = {};
    if (params.tenantId && params.tenantId !== 'all') {
      where.tenantId = params.tenantId;
    }
    if (params.category && params.category !== 'all') {
      where.category = params.category as SystemLogCategory;
    }
    if (params.search && params.search.trim()) {
      where.message = { contains: params.search.trim(), mode: 'insensitive' };
    }

    return this.prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
      include: {
        tenant: {
          select: { id: true, name: true },
        },
      },
    });
  }
}

