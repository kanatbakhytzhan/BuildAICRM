import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (dto.tenantId) {
      return this.authService.login(dto.tenantId, dto.email, dto.password);
    }
    return this.authService.loginByEmail(dto.email, dto.password);
  }
}
