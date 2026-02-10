import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SystemLogsService } from './system.logs.service';
import { AdminGuard } from '../admin/admin.guard';
import { SystemLogCategory } from '@prisma/client';

@Controller('admin/logs')
@UseGuards(AdminGuard)
export class AdminLogsController {
  constructor(private logs: SystemLogsService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const cat = category && category !== 'all' ? (category as SystemLogCategory) : 'all';
    const lim = limit ? Number(limit) : undefined;
    return this.logs.list({
      tenantId,
      category: cat,
      search,
      limit: lim,
    });
  }
}

