import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    PipelineModule,
    LeadsModule,
    MessagesModule,
    AdminModule,
    SystemModule,
    AiModule,
    FollowupsModule,
  ],
})
export class AppModule {}
