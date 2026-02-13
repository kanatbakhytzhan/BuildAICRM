import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const DEFAULT_STAGES = [
  { name: 'Новые', type: 'new' },
  { name: 'В работе (AI)', type: 'in_progress' },
  { name: 'Просит звонок', type: 'wants_call' },
  { name: 'Полные данные', type: 'full_data' },
  { name: 'Успех', type: 'success' },
  { name: 'Отказ', type: 'refused' },
];

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

  async create(data: { name: string; loginEmail?: string; loginPassword?: string }) {
    const tenant = await this.prisma.tenant.create({
      data: { name: data.name },
    });
    await this.prisma.pipelineStage.createMany({
      data: DEFAULT_STAGES.map((s, i) => ({
        tenantId: tenant.id,
        name: s.name,
        type: s.type,
        order: i,
      })),
    });
    if (data.loginEmail && data.loginPassword) {
      const passwordHash = await bcrypt.hash(data.loginPassword, 10);
      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: data.loginEmail.toLowerCase().trim(),
          passwordHash,
          name: data.name,
          role: 'owner',
        },
      });
    }
    return tenant;
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
    let s = t.settings;
    if (!s) {
      s = await this.prisma.tenantSettings.create({
        data: { tenantId },
      });
    }
    const out = { ...s } as Record<string, unknown>;
    out.openaiApiKey = s.openaiApiKey ? '••••••••' : null;
    return out as typeof s;
  }

  async updateSettings(tenantId: string, data: Record<string, unknown>) {
    await this.findOne(tenantId);
    const allowed = [
      'aiEnabled', 'openaiApiKey', 'openaiModel', 'chatflowInstanceId', 'chatflowApiToken', 'webhookUrl', 'webhookKey',
      'systemPrompt', 'respondFirst', 'suggestCall', 'askQuestions',
      'nightModeEnabled', 'nightModeStart', 'nightModeEnd', 'nightModeMessage',
      'followUpEnabled', 'followUpDelay', 'followUpMessage',
      'revenueGoal',
    ];
    let payload = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    ) as Record<string, unknown>;
    if (payload.openaiApiKey === '••••••••' || payload.openaiApiKey === '') {
      delete payload.openaiApiKey;
    }
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
