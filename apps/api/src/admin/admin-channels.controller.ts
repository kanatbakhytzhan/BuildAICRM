import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { ChannelsService } from '../channels/channels.service';
import { IsOptional, IsString, MinLength } from 'class-validator';

class CreateChannelDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  externalId: string;
}

class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  externalId?: string;
}

@Controller('admin/tenants/:tenantId/channels')
@UseGuards(AdminGuard)
export class AdminChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.channelsService.listByTenant(tenantId);
  }

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateChannelDto) {
    return this.channelsService.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.channelsService.remove(tenantId, id);
  }
}
