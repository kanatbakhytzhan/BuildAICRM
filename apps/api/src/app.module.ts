import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { LeadsModule } from './leads/leads.module';
import { MessagesModule } from './messages/messages.module';
import { AdminModule } from './admin/admin.module';
import { SystemModule } from './system/system.module';
import { AiModule } from './ai/ai.module';
import { FollowupsModule } from './followups/followups.module';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ChannelsModule } from './channels/channels.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    WebhooksModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    PipelineModule,
    LeadsModule,
    MessagesModule,
    ChannelsModule,
    TopicsModule,
    AdminModule,
    SystemModule,
    AiModule,
    FollowupsModule,
  ],
})
export class AppModule {}
