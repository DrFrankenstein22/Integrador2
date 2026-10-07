import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  dni: string;
};

type JwtPayload = {
  sub: string;
  dni: string;
};

export type RequestWithUser = Request & { user: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      request.user = { id: payload.sub, dni: payload.dni };
      return true;
    } catch {
      throw new UnauthorizedException('El token de acceso no es válido o expiró');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;

    if (!header) {
      return null;
    }

    const [scheme, value] = header.split(' ');

    return scheme === 'Bearer' && value ? value : null;
  }
}
