import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

import { AuditRequest, resolveCorrelationId } from '../audit/audit-request';
import { ObservabilityService } from './observability.service';

/**
 * Se registra DESPUES de AuditModule en app.module.ts: Nest anida los
 * APP_INTERCEPTOR globales en orden de registro, y la fase pre de
 * AuditInterceptor (donde asigna request.correlationId, sincrona) corre
 * antes que esta. El fallback de abajo cubre el caso de que ese orden
 * cambiara alguna vez, sin generar un correlationId distinto al que Audit
 * ya puso en el header X-Correlation-ID y en la BD.
 */
@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(private readonly obs: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.obs.enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditRequest>();
    const correlationId =
      request.correlationId ?? resolveCorrelationId(request.headers['x-correlation-id']);

    this.obs.addAttributes({
      correlationId,
      actorUserId: request.user?.id,
      handler: `${context.getClass().name}.${context.getHandler().name}`,
      httpMethod: request.method,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.obs.addAttributes({ route: this.routePath(request) });
        },
        error: (exception: unknown) => {
          const status =
            exception instanceof HttpException ? exception.getStatus() : 500;
          this.obs.addAttributes({
            route: this.routePath(request),
            statusCode: status,
          });
          // Nest convierte toda excepcion en respuesta via su
          // ExceptionsHandler; el error handler de Express nunca la ve.
          // Sin este noticeError explicito, el Errors Inbox quedaria vacio
          // aunque haya 500s reales.
          if (status >= 500) {
            this.obs.noticeError(exception, {
              correlationId,
              route: this.routePath(request),
            });
          }
        },
      }),
    );
  }

  private routePath(request: AuditRequest): string {
    const routePath = (request.route as { path?: unknown } | undefined)?.path;

    if (typeof routePath === 'string') {
      return `${request.baseUrl ?? ''}${routePath}`;
    }

    return (request.originalUrl || request.path || '/').split('?')[0];
  }
}
