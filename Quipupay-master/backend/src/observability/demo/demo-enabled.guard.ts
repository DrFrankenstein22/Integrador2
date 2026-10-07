import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Segundo candado (el primero es no registrar el controller en
 * ObservabilityModule cuando NODE_ENV=production). Este cubre el caso de
 * que ese registro condicional cambiara o el proceso arrancara con
 * NODE_ENV mal seteado. Mismo patron que
 * MovementsService.seedDemo (src/accounts/movements.service.ts).
 */
@Injectable()
export class DemoEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('No disponible en producción');
    }
    return true;
  }
}
