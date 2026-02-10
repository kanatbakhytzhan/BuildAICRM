import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminFollowupsService } from './admin-followups.service';
import { AdminGuard } from './admin.guard';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateFollowUpDto {
  @IsString()
  name: string;

  @IsString()
  messageText: string;

  @IsString()
  delayLabel: string;

  @IsNumber()
  delayMinutes: number;
}

class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  messageText?: string;

  @IsOptional()
  @IsString()
  delayLabel?: string;

  @IsOptional()
  @IsNumber()
  delayMinutes?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('admin/tenants/:tenantId/follow-ups')
@UseGuards(AdminGuard)
export class AdminFollowupsController {
  constructor(private service: AdminFollowupsService) {}

  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateFollowUpDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: UpdateFollowUpDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
