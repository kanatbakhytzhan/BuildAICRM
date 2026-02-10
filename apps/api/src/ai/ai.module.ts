import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { SystemModule } from '../system/system.module';
import { FollowupsModule } from '../followups/followups.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [PrismaModule, MessagesModule, SystemModule, FollowupsModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}

