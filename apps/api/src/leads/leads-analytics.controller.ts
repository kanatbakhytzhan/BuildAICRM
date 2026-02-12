import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/tenant.decorator';
import { RequestUser } from '../auth/jwt.strategy';

/** Отдельный контроллер для GET /leads/analytics, чтобы маршрут не перехватывался как GET /leads/:id. */
@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsAnalyticsController {
  constructor(private leadsService: LeadsService) {}

  @Get('analytics')
  getAnalytics(@CurrentUser() user: RequestUser, @Query('period') period?: string) {
    const p = period === 'week' || period === 'month' || period === 'year' ? period : 'day';
    return this.leadsService.getAnalytics(user.tenantId, p);
  }
}
