import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByTenantAndEmail(tenantId: string, email: string) {
    return this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, tenantId: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, data: { email: string; password: string; name?: string; role: UserRole }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}
