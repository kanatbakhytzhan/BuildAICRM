import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: 'global_admin';
}

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.prisma.globalAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!admin) return null;
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return null;
    const { passwordHash: _, ...user } = admin;
    return user;
  }

  async login(email: string, password: string) {
    const admin = await this.validateAdmin(email, password);
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: 'global_admin',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: admin.id, email: admin.email, name: admin.name },
    };
  }
}
