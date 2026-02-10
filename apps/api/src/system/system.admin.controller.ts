import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { SystemSettingsService } from './system.settings.service';
import { AdminGuard } from '../admin/admin.guard';

class UpdateSystemSettingsDto {
  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsBoolean()
  aiGlobalEnabled?: boolean;
}

@Controller('admin/system/settings')
@UseGuards(AdminGuard)
export class AdminSystemController {
  constructor(private settings: SystemSettingsService) {}

  @Get()
  get() {
    return this.settings.getSettings();
  }

  @Patch()
  update(@Body() dto: UpdateSystemSettingsDto) {
    return this.settings.updateSettings(dto);
  }
}

