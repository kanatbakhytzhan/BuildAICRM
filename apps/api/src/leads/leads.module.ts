import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsAnalyticsController } from './leads-analytics.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [LeadsService],
  controllers: [LeadsAnalyticsController, LeadsController], // analytics первым, чтобы /leads/analytics не матчился как :id
  exports: [LeadsService],
})
export class LeadsModule {}
