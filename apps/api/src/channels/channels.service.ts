import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async listByTenant(tenantId: string) {
    return this.prisma.tenantChannel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string; externalId: string }) {
    return this.prisma.tenantChannel.create({
      data: { tenantId, name: data.name, externalId: data.externalId.trim() },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; externalId?: string }) {
    await this.findOne(tenantId, id);
    return this.prisma.tenantChannel.update({
      where: { id },
      data: data.externalId !== undefined ? { ...data, externalId: data.externalId.trim() } : data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.tenantChannel.delete({ where: { id } });
  }

  async findOne(tenantId: string, id: string) {
    const ch = await this.prisma.tenantChannel.findFirst({
      where: { id, tenantId },
    });
    if (!ch) throw new NotFoundException('Channel not found');
    return ch;
  }
}
