import { Body, Controller, Get, Put, Query, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { IsArray, IsString } from 'class-validator';

class SetAttendanceDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Get('today')
  async getToday(@CurrentUser() user: RequestUser) {
    return this.shiftsService.getForDate(user.tenantId, new Date());
  }

  @Get()
  async get(@CurrentUser() user: RequestUser, @Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.shiftsService.getForDate(user.tenantId, date);
  }

  @Put('today')
  async setToday(@CurrentUser() user: RequestUser, @Body() dto: SetAttendanceDto) {
    if (user.role !== 'owner' && user.role !== 'rop') {
      throw new ForbiddenException('Только владелец или РОП может отмечать смену');
    }
    return this.shiftsService.setForDate(user.tenantId, new Date(), dto.userIds);
  }

  @Put()
  async set(
    @CurrentUser() user: RequestUser,
    @Query('date') dateStr: string,
    @Body() dto: SetAttendanceDto,
  ) {
    if (user.role !== 'owner' && user.role !== 'rop') {
      throw new ForbiddenException('Только владелец или РОП может отмечать смену');
    }
    if (!dateStr) throw new BadRequestException('Укажите дату');
    return this.shiftsService.setForDate(user.tenantId, new Date(dateStr), dto.userIds);
  }
}
