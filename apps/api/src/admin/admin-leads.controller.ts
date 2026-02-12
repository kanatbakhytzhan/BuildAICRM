import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminLeadsService } from './admin-leads.service';
import { IsNumber, IsOptional } from 'class-validator';

class UpdateDealAmountDto {
  @IsOptional()
  @IsNumber()
  dealAmount?: number | null;
}

@Controller('admin/tenants/:tenantId/leads')
@UseGuards(AdminGuard)
export class AdminLeadsController {
  constructor(private service: AdminLeadsService) {}

  @Get()
  listSuccess(@Param('tenantId') tenantId: string) {
    return this.service.listSuccessLeads(tenantId);
  }

  @Patch(':leadId')
  updateDealAmount(
    @Param('tenantId') tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateDealAmountDto,
  ) {
    return this.service.updateDealAmount(tenantId, leadId, dto.dealAmount ?? null);
  }
}

@Controller('admin/tenants/:tenantId/analytics')
@UseGuards(AdminGuard)
export class AdminAnalyticsController {
  constructor(private service: AdminLeadsService) {}

  @Get()
  getAnalytics(@Param('tenantId') tenantId: string, @Query('period') period?: string) {
    const p = period === 'week' || period === 'month' || period === 'year' ? period : 'day';
    return this.service.getAnalytics(tenantId, p);
  }
}
