import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsNumber, IsOptional, IsString } from 'class-validator';

class CreateStageDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}

class UpdateStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  topicId?: string | null;
}

@Controller('pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.pipelineService.listByTenant(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.pipelineService.findOne(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStageDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.pipelineService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateStageDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.pipelineService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.pipelineService.remove(user.tenantId, id);
  }
}
