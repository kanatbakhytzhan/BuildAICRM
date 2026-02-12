import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { QuickRepliesService } from './quick-replies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

class CreateQuickReplyDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @MinLength(1)
  messageText: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

class UpdateQuickReplyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  messageText?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  constructor(private quickRepliesService: QuickRepliesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.quickRepliesService.listByTenant(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuickReplyDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.quickRepliesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuickReplyDto,
  ) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.quickRepliesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    return this.quickRepliesService.remove(user.tenantId, id);
  }
}
