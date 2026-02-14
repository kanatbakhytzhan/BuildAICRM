import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(tenantId: string, email: string, password: string) {
    const user = await this.usersService.findByTenantAndEmail(tenantId, email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(tenantId: string, email: string, password: string) {
    const user = await this.validateUser(tenantId, email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.signToken(user);
  }

  /** Вход только по email и паролю (без выбора организации) */
  async loginByEmail(email: string, password: string) {
    const user = await this.usersService.findByEmailAndPassword(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.signToken(user);
  }

  signToken(user: { id: string; email: string; tenantId: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return { access_token: this.jwtService.sign(payload), user };
  }
}
