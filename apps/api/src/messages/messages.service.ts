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

    return message;
  }
}
