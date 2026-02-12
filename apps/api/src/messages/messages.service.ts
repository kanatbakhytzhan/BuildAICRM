import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageSource, MessageDirection } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFileDto {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
}

const AUDIO_EXT = /\.(webm|ogg|opus|mp3|m4a|aac|wav|oga)$/i;

function getApiPublicUrl(): string {
  const url = process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';
  return url.replace(/\/$/, '');
}

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async saveUpload(tenantId: string, leadId: string, file: UploadedFileDto): Promise<string> {
    if (!file?.buffer) throw new NotFoundException('No file');
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const ext = path.extname(file.originalname) || '.webm';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const dir = path.join(process.cwd(), 'uploads', leadId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/${leadId}/${name}`;
  }

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

    // Отправить исходящее в WhatsApp (текст или голос) с того же номера (канала), что и лид
    if (
      data.direction === MessageDirection.out &&
      data.source === MessageSource.human &&
      (data.body?.trim() || data.mediaUrl)
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
          const isAudio = data.mediaUrl && AUDIO_EXT.test(data.mediaUrl);
          const apiBase = getApiPublicUrl();

          try {
            // Текст всегда отправляем (чтобы хоть что-то доходило, если send-media нет или нет API_PUBLIC_URL)
            if (data.body?.trim()) {
              const url = new URL('https://app.chatflow.kz/api/v1/send-text');
              url.searchParams.set('token', settings.chatflowApiToken);
              url.searchParams.set('instance_id', instanceId);
              url.searchParams.set('jid', jid);
              url.searchParams.set('msg', data.body.trim());
              await fetch(url.toString());
            }
            // Дополнительно пробуем отправить голосовое как аудио (если есть публичный URL)
            if (isAudio && apiBase) {
              const mediaUrl = new URL('https://app.chatflow.kz/api/v1/send-media');
              mediaUrl.searchParams.set('token', settings.chatflowApiToken);
              mediaUrl.searchParams.set('instance_id', instanceId);
              mediaUrl.searchParams.set('jid', jid);
              mediaUrl.searchParams.set('url', `${apiBase}${data.mediaUrl}`);
              mediaUrl.searchParams.set('type', 'ptt');
              await fetch(mediaUrl.toString());
            }
          } catch {
            // не падаем: сообщение уже сохранено в CRM
          }
        }
      }
    }

    return message;
  }

  /** Отправить исходящее сообщение лиду в WhatsApp (тот же канал/номер, что у лида). Для AI и webhook. */
  async sendToLead(tenantId: string, leadId: string, body: string): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead || !body?.trim()) return false;
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
    if (!settings?.chatflowApiToken || !instanceId) return false;
    const phone = String(lead.phone).replace(/\D/g, '');
    if (phone.length < 10) return false;
    const jid = `${phone}@s.whatsapp.net`;
    const url = new URL('https://app.chatflow.kz/api/v1/send-text');
    url.searchParams.set('token', settings.chatflowApiToken);
    url.searchParams.set('instance_id', instanceId);
    url.searchParams.set('jid', jid);
    url.searchParams.set('msg', body.trim());
    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as { success?: boolean };
      return data?.success === true;
    } catch {
      return false;
    }
  }
}
