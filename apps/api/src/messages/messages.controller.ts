import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsString } from 'class-validator';
import { MessageDirection, MessageSource } from '@prisma/client';

class CreateMessageDto {
  @IsString()
  body: string;
}

@Controller('leads/:leadId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('leadId') leadId: string) {
    return this.messagesService.listByLead(user.tenantId, leadId);
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
    });
  }
}
