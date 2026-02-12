import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth.module';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminFollowupsService } from './admin-followups.service';
import { AdminFollowupsController } from './admin-followups.controller';
import { AdminLeadsService } from './admin-leads.service';
import { AdminLeadsController, AdminAnalyticsController } from './admin-leads.controller';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminTenantsService, AdminFollowupsService, AdminLeadsService],
  controllers: [AdminTenantsController, AdminFollowupsController, AdminLeadsController, AdminAnalyticsController],
})
export class AdminModule {}
