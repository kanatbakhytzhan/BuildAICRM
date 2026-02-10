import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminAuthService, AdminJwtPayload } from './admin-auth.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'buildcrm-dev-secret',
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.role !== 'global_admin') throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
