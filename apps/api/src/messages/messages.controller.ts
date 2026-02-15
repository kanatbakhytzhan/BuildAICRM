import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsString, IsOptional } from 'class-validator';
import { MessageDirection, MessageSource } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

class CreateMessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

@Controller('leads/:leadId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('leadId') leadId: string) {
    return this.messagesService.listByLead(user.tenantId, leadId);
  }

  @Get('stream-media')
  async streamMedia(
    @CurrentUser() user: RequestUser,
    @Param('leadId') leadId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    await this.messagesService.getLeadIfAccess(user.tenantId, leadId);
    const rawUrl = typeof url === 'string' ? url.trim() : '';
    if (!rawUrl) return res.status(400).send('Missing url');
    try {
      if (rawUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), rawUrl);
        if (!filePath.startsWith(path.join(process.cwd(), 'uploads'))) return res.status(400).send('Invalid path');
        if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.ogg' ? 'audio/ogg' : ext === '.mp3' ? 'audio/mpeg' : ext === '.m4a' ? 'audio/mp4' : 'audio/ogg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }
      const fetchRes = await fetch(rawUrl, { signal: AbortSignal.timeout(15000) });
      if (!fetchRes.ok) return res.status(502).send('Upstream error');
      const contentType = fetchRes.headers.get('content-type') || 'audio/ogg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const buf = await fetchRes.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch {
      return res.status(502).send('Stream failed');
    }
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('leadId') leadId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createForLead(user.tenantId, leadId, {
      source: MessageSource.human,
      direction: MessageDirection.out,
      body: dto.body ?? '',
      mediaUrl: dto.mediaUrl,
    });
  }
}
