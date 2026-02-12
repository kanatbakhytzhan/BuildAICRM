import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuickRepliesService {
  constructor(private prisma: PrismaService) {}

  async listByTenant(tenantId: string) {
    return this.prisma.quickReplyTemplate.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(
    tenantId: string,
    data: { label: string; messageText: string; sortOrder?: number },
  ) {
    const order =
      data.sortOrder ??
      (await this.prisma.quickReplyTemplate.count({ where: { tenantId } }));
    return this.prisma.quickReplyTemplate.create({
      data: {
        tenantId,
        label: data.label,
        messageText: data.messageText,
        sortOrder: order,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: { label?: string; messageText?: string; sortOrder?: number },
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.quickReplyTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.quickReplyTemplate.delete({ where: { id } });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.quickReplyTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!t) throw new NotFoundException('Quick reply template not found');
    return t;
  }
}
