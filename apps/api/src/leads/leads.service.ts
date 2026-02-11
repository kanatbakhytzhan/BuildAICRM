import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadScore, Prisma } from '@prisma/client';

export interface ListLeadsOptions {
  tenantId: string;
  stageId?: string;
  assignedUserId?: string | null;
  onlyMine?: boolean;
  userId?: string;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async list(options: ListLeadsOptions) {
    const where: Record<string, unknown> = { tenantId: options.tenantId };
    if (options.stageId) where.stageId = options.stageId;
    if (options.onlyMine && options.userId) where.assignedUserId = options.userId;
    else if (options.assignedUserId !== undefined) where.assignedUserId = options.assignedUserId;

    return this.prisma.lead.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, type: true, order: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        channel: { select: { id: true, name: true, externalId: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: [{ leadScore: 'desc' }, { lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        stage: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        channel: { select: { id: true, name: true, externalId: true } },
        topic: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(
    tenantId: string,
    data: {
      stageId: string;
      phone: string;
      name?: string;
      assignedUserId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        stageId: data.stageId,
        phone: data.phone,
        name: data.name,
        assignedUserId: data.assignedUserId,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      stageId?: string;
      assignedUserId?: string | null;
      leadScore?: LeadScore;
      aiActive?: boolean;
      name?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.lead.delete({ where: { id } });
  }
}
