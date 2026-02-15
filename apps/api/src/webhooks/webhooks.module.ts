import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { MessagesModule } from '../messages/messages.module';
import { FollowupsModule } from '../followups/followups.module';
import { AiModule } from '../ai/ai.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { WebhooksController } from './webhooks.controller';
import { TranscribeService } from './transcribe.service';

@Module({
  imports: [PrismaModule, SystemModule, MessagesModule, FollowupsModule, AiModule, ShiftsModule],
  controllers: [WebhooksController],
  providers: [TranscribeService],
})
export class WebhooksModule {}
