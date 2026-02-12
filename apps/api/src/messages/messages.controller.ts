import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsString, IsOptional } from 'class-validator';
import { MessageDirection, MessageSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

class CreateMessageDto {
  @IsString()
  body: string;

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: RequestUser,
    @Param('leadId') leadId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const mediaUrl = await this.messagesService.saveUpload(user.tenantId, leadId, file);
    return { mediaUrl };
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
      body: dto.body,
      mediaUrl: dto.mediaUrl,
    });
  }
}
