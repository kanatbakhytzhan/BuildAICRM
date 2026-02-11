import { Body, Controller, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsArray, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleTopicIds?: string[];
}

class UpdateVisibleTopicsDto {
  @IsArray()
  @IsString({ each: true })
  visibleTopicIds: string[];
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    if (user.role !== 'owner' && user.role !== 'rop') {
      return [];
    }
    return this.usersService.listByTenant(user.tenantId);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    if (user.role !== 'owner' && user.role !== 'rop') {
      throw new ForbiddenException();
    }
    return this.usersService.create(user.tenantId, dto);
  }

  @Patch(':id/visible-topics')
  async updateVisibleTopics(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateVisibleTopicsDto,
  ) {
    if (user.role !== 'owner' && user.role !== 'rop') {
      throw new ForbiddenException();
    }
    return this.usersService.updateVisibleTopics(id, user.tenantId, dto.visibleTopicIds);
  }
}
