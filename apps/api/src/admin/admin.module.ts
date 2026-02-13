import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth.module';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminFollowupsService } from './admin-followups.service';
import { AdminFollowupsController } from './admin-followups.controller';
import { AdminLeadsService } from './admin-leads.service';
import { AdminLeadsController, AdminAnalyticsController } from './admin-leads.controller';
import { AdminChannelsController } from './admin-channels.controller';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [AdminAuthModule, ChannelsModule],
  providers: [AdminTenantsService, AdminFollowupsService, AdminLeadsService],
  controllers: [
    AdminTenantsController,
    AdminFollowupsController,
    AdminLeadsController,
    AdminAnalyticsController,
    AdminChannelsController,
  ],
})
export class AdminModule {}
