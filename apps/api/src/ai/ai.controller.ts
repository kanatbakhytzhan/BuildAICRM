import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';

class FakeIncomingDto {
  @IsString()
  tenantId: string;

  @IsString()
  leadId: string;

  @IsString()
  text: string;
}

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  /**
   * Входящее «фейковое» сообщение, имитирующее Webhook от WhatsApp.
   * Можно дергать из Postman: tenantId, leadId, text.
   */
  @Post('fake-incoming')
  fakeIncoming(@Body() dto: FakeIncomingDto) {
    return this.ai.handleFakeIncoming(dto);
  }

  /**
   * Забрать диалог у AI (handoff к человеку).
   */
  @UseGuards(JwtAuthGuard)
  @Post('leads/:leadId/handoff/take')
  takeOver(@CurrentUser() user: RequestUser, @Param('leadId') leadId: string) {
    return this.ai.takeOverLead({
      tenantId: user.tenantId,
      leadId,
      userId: user.id,
    });
  }

  /**
   * Вернуть диалог обратно AI.
   */
  @UseGuards(JwtAuthGuard)
  @Post('leads/:leadId/handoff/release')
  release(@CurrentUser() user: RequestUser, @Param('leadId') leadId: string) {
    return this.ai.releaseLead({
      tenantId: user.tenantId,
      leadId,
    });
  }
}

