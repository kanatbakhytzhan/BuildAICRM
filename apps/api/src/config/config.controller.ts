import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateConfigDto {
  @ValidateIf((_o, v) => v != null)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenueGoal?: number | null;
}

@Controller('config')
@UseGuards(JwtAuthGuard)
export class ConfigController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() user: RequestUser) {
    const s = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { revenueGoal: true },
    });
    return { revenueGoal: s?.revenueGoal ?? null };
  }

  @Patch()
  async update(@CurrentUser() user: RequestUser, @Body() dto: UpdateConfigDto) {
    if (user.role !== 'owner' && user.role !== 'rop') throw new ForbiddenException();
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const value = dto.revenueGoal === undefined ? undefined : dto.revenueGoal;
    if (existing) {
      await this.prisma.tenantSettings.update({
        where: { tenantId: user.tenantId },
        data: { revenueGoal: value ?? undefined },
      });
    } else {
      await this.prisma.tenantSettings.create({
        data: { tenantId: user.tenantId, revenueGoal: value ?? undefined },
      });
    }
    return { revenueGoal: value ?? null };
  }
}
