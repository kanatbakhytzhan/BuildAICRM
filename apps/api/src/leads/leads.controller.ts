import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { LeadScore } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsObject } from 'class-validator';

class CreateLeadDto {
  @IsString()
  stageId: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class UpdateLeadDto {
  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string | null;

  @IsOptional()
  @IsEnum(LeadScore)
  leadScore?: LeadScore;

  @IsOptional()
  @IsBoolean()
  aiActive?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('stageId') stageId?: string,
    @Query('onlyMine') onlyMine?: string,
  ) {
    return this.leadsService.list({
      tenantId: user.tenantId,
      stageId,
      onlyMine: onlyMine === 'true',
      userId: user.id,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.leadsService.findOne(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.leadsService.remove(user.tenantId, id);
  }
}
