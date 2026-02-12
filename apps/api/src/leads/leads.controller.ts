import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { LeadScore } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsObject, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsNumber()
  @Type(() => Number)
  dealAmount?: number | null;
}

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(
    private leadsService: LeadsService,
    private usersService: UsersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('stageId') stageId?: string,
    @Query('topicId') topicId?: string,
    @Query('onlyMine') onlyMine?: string,
  ) {
    const visibleTopicIds = await this.usersService.getVisibleTopicIds(user.id);
    return this.leadsService.list({
      tenantId: user.tenantId,
      stageId,
      topicId,
      onlyMine: onlyMine === 'true',
      userId: user.id,
      visibleTopicIds,
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
