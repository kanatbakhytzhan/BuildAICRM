import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemSettingsService } from './system.settings.service';
import { SystemLogsService } from './system.logs.service';
import { AdminSystemController } from './system.admin.controller';
import { AdminLogsController } from './system.logs.controller';

@Module({
  imports: [PrismaModule],
  providers: [SystemSettingsService, SystemLogsService],
  controllers: [AdminSystemController, AdminLogsController],
  exports: [SystemSettingsService, SystemLogsService],
})
export class SystemModule {}

