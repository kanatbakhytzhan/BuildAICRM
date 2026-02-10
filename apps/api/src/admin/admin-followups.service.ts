import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminFollowupsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string) {
    await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return this.prisma.followUpTemplate.findMany({
      where: { tenantId },
      orderBy: { delayMinutes: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string; messageText: string; delayLabel: string; delayMinutes: number }) {
    await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return this.prisma.followUpTemplate.create({
      data: { tenantId, ...data },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; messageText?: string; delayLabel?: string; delayMinutes?: number; active?: boolean }) {
    const t = await this.prisma.followUpTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return this.prisma.followUpTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    const t = await this.prisma.followUpTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return this.prisma.followUpTemplate.delete({ where: { id } });
  }
}
