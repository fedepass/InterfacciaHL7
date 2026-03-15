import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const token = await this.authService.validateUser(body.username, body.password);
    if (!token) throw new UnauthorizedException('Credenziali non valide');
    return { token };
  }
}
