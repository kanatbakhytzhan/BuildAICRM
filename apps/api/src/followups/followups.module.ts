import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { SystemModule } from '../system/system.module';
import { FollowupsSchedulerService } from './followups.scheduler.service';

@Module({
  imports: [PrismaModule, MessagesModule, SystemModule],
  providers: [FollowupsSchedulerService],
  exports: [FollowupsSchedulerService],
})
export class FollowupsModule {}

