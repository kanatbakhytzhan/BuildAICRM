import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsOptional, IsString, MinLength } from 'class-validator';

class CreateChannelDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  externalId: string; // instance_id из ChatFlow для этого номера
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

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.channelsService.listByTenant(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateChannelDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.channelsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateChannelDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.channelsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.channelsService.remove(user.tenantId, id);
  }
}
