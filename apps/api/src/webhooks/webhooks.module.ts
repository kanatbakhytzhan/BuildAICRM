import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { MessagesModule } from '../messages/messages.module';
import { FollowupsModule } from '../followups/followups.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, SystemModule, MessagesModule, FollowupsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
