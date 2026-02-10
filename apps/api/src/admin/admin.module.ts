import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth.module';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminFollowupsService } from './admin-followups.service';
import { AdminFollowupsController } from './admin-followups.controller';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminTenantsService, AdminFollowupsService],
  controllers: [AdminTenantsController, AdminFollowupsController],
})
export class AdminModule {}
