import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageSource, MessageDirection } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async listByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) return [];
    return this.prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    leadId: string,
    data: {
      source: MessageSource;
      direction: MessageDirection;
      body?: string;
      mediaUrl?: string;
    },
  ) {
    return this.prisma.message.create({
      data: { leadId, ...data },
    });
  }

  async createForLead(
    tenantId: string,
    leadId: string,
    data: {
      source: MessageSource;
      direction: MessageDirection;
      body?: string;
      mediaUrl?: string;
    },
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const message = await this.create(lead.id, data);
    const now = new Date();

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: data.body ? data.body.slice(0, 120) : null,
        noResponseSince: data.direction === MessageDirection.out ? now : null,
      },
    });

    // Отправить исходящее с того же номера (канала), что и лид
    if (
      data.direction === MessageDirection.out &&
      data.body?.trim() &&
      data.source === MessageSource.human
    ) {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });
      let instanceId: string | null = settings?.chatflowInstanceId ?? null;
      if (lead.channelId) {
        const ch = await this.prisma.tenantChannel.findUnique({
          where: { id: lead.channelId },
        });
        if (ch && ch.externalId !== 'default') instanceId = ch.externalId;
      }
      if (settings?.chatflowApiToken && instanceId) {
        const phone = String(lead.phone).replace(/\D/g, '');
        if (phone.length >= 10) {
          const jid = `${phone}@s.whatsapp.net`;
          const url = new URL('https://app.chatflow.kz/api/v1/send-text');
          url.searchParams.set('token', settings.chatflowApiToken);
          url.searchParams.set('instance_id', instanceId);
          url.searchParams.set('jid', jid);
          url.searchParams.set('msg', data.body.trim());
          try {
            await fetch(url.toString());
          } catch {
            // не падаем: сообщение уже сохранено в CRM
          }
        }
      }
    }

    return message;
  }
}
