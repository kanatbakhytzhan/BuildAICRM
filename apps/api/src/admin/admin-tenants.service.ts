import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminTenantsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      include: {
        settings: { select: { aiEnabled: true } },
        _count: { select: { leads: true } },
      },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async create(data: { name: string }) {
    return this.prisma.tenant.create({
      data: { name: data.name },
    });
  }

  async update(id: string, data: { name?: string; status?: string }) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async getSettings(tenantId: string) {
    const t = await this.findOne(tenantId);
    if (t.settings) return t.settings;
    return this.prisma.tenantSettings.create({
      data: { tenantId },
    });
  }

  async updateSettings(tenantId: string, data: Record<string, unknown>) {
    await this.findOne(tenantId);
    const allowed = [
      'aiEnabled', 'chatflowInstanceId', 'chatflowApiToken', 'webhookUrl',
      'systemPrompt', 'respondFirst', 'suggestCall', 'askQuestions',
      'nightModeEnabled', 'nightModeStart', 'nightModeEnd', 'nightModeMessage',
      'followUpEnabled', 'followUpDelay', 'followUpMessage',
    ];
    const payload = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    ) as Record<string, unknown>;
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    if (existing) {
      return this.prisma.tenantSettings.update({
        where: { tenantId },
        data: payload,
      });
    }
    return this.prisma.tenantSettings.create({
      data: { tenantId, ...payload } as never,
    });
  }
}
