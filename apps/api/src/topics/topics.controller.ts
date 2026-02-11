import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

class CreateTopicDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  scenarioText?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  scenarioText?: string | null;

  @IsOptional()
  @IsString()
  mediaUrl?: string | null;
}

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.topicsService.listByTenant(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTopicDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.topicsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTopicDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.topicsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.topicsService.remove(user.tenantId, id);
  }
}
