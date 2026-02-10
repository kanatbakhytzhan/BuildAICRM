import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          id: 'singleton',
        },
      });
    }
    return settings;
  }

  async updateSettings(data: {
    defaultTimezone?: string;
    maintenanceMode?: boolean;
    aiGlobalEnabled?: boolean;
  }) {
    await this.getSettings();
    return this.prisma.systemSettings.update({
      where: { id: 'singleton' },
      data,
    });
  }
}

