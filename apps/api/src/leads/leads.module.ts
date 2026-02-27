import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsAnalyticsController } from './leads-analytics.controller';
import { LeadCleanupService } from './lead-cleanup.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [LeadsService, LeadCleanupService],
  controllers: [LeadsAnalyticsController, LeadsController],
  exports: [LeadsService, LeadCleanupService],
})
export class LeadsModule {}
