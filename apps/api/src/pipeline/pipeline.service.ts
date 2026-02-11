import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async listByTenant(tenantId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
      include: { topic: { select: { id: true, name: true } }, _count: { select: { leads: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id, tenantId },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    return stage;
  }

  async create(tenantId: string, data: { name: string; type: string; topicId?: string }) {
    const max = await this.prisma.pipelineStage.aggregate({
      where: { tenantId },
      _max: { order: true },
    });
    const order = (max._max.order ?? -1) + 1;
    return this.prisma.pipelineStage.create({
      data: { tenantId, name: data.name, type: data.type, order, topicId: data.topicId ?? undefined },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; type?: string; order?: number; topicId?: string | null }) {
    await this.findOne(tenantId, id);
    return this.prisma.pipelineStage.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.pipelineStage.delete({ where: { id } });
  }
}
