import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async listByTenant(tenantId: string) {
    return this.prisma.tenantTopic.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string; sortOrder?: number; scenarioText?: string; mediaUrl?: string; welcomeVoiceUrl?: string; welcomeImageUrl?: string; addressText?: string | null }) {
    const order = data.sortOrder ?? (await this.prisma.tenantTopic.count({ where: { tenantId } }));
    return this.prisma.tenantTopic.create({
      data: {
        tenantId,
        name: data.name,
        sortOrder: order,
        scenarioText: data.scenarioText ?? undefined,
        mediaUrl: data.mediaUrl ?? undefined,
        welcomeVoiceUrl: data.welcomeVoiceUrl ?? undefined,
        welcomeImageUrl: data.welcomeImageUrl ?? undefined,
        addressText: data.addressText ?? undefined,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; sortOrder?: number; scenarioText?: string | null; mediaUrl?: string | null; welcomeVoiceUrl?: string | null; welcomeImageUrl?: string | null; addressText?: string | null }) {
    await this.findOne(tenantId, id);
    return this.prisma.tenantTopic.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.tenantTopic.delete({ where: { id } });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.tenantTopic.findFirst({
      where: { id, tenantId },
    });
    if (!t) throw new NotFoundException('Topic not found');
    return t;
  }
}
