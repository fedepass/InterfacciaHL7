import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!req.path.startsWith('/api/') || req.path.startsWith('/api/auth/')) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Non autorizzato' });
    }

    const payload = this.authService.verifyToken(authHeader.slice(7));
    if (!payload) {
      return res.status(401).json({ message: 'Token non valido o scaduto' });
    }

    next();
  }
}
