import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminGuard } from './admin.guard';
import { IsOptional, IsString } from 'class-validator';

class CreateTenantDto {
  @IsString()
  name: string;
}

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

@Controller('admin/tenants')
@UseGuards(AdminGuard)
export class AdminTenantsController {
  constructor(private service: AdminTenantsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string) {
    return this.service.getSettings(id);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateSettings(id, body);
  }
}
