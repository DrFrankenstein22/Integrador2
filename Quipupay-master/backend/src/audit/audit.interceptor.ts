import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { catchError, tap, throwError } from 'rxjs';
import { concatMap, from, mergeMap } from 'rxjs';
import { Reflector } from '@nestjs/core';

import { AuditRequest, resolveCorrelationId } from './audit-request';
import {
  AUDIT_EVENT_METADATA,
  AuditEventOptions,
} from './audit-event.decorator';
import { AuditService } from './audit.service';
import type {
  AuditMetadata,
  AuditMetadataValue,
  AuditRecordInput,
} from './audit.types';

type TechnicalRequestLog = {
  timestamp: string;
  correlationId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  exceptionName?: string;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    request.correlationId = resolveCorrelationId(
      request.headers['x-correlation-id'],
    );
    response.setHeader('X-Correlation-ID', request.correlationId);
    const event = this.reflector.getAllAndOverride<AuditEventOptions>(
      AUDIT_EVENT_METADATA,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      concatMap(async (value: unknown) => {
        if (event) {
          await this.recordSafely(this.successRecord(request, event, value));
        }
        this.logger.log(
          this.requestLog(request, response.statusCode, startedAt),
        );
        return value;
      }),
      catchError((exception: unknown) => {
        return from(
          event
            ? this.recordSafely(this.failureRecord(request, event))
            : Promise.resolve(),
        ).pipe(
          tap(() => {
            this.logger.error(
              this.requestLog(
                request,
                exception instanceof HttpException
                  ? exception.getStatus()
                  : 500,
                startedAt,
                exception,
              ),
            );
          }),
          mergeMap(() => throwError(() => exception)),
        );
      }),
    );
  }

  private successRecord(
    request: AuditRequest,
    event: AuditEventOptions,
    response: unknown,
  ): AuditRecordInput {
    return {
      ...this.baseRecord(request, event),
      actorUserId:
        this.stringAtPath(response, event.actorResponsePath) ?? request.user?.id,
      entityId: this.stringAtPath(response, event.entityIdResponsePath),
      result: 'SUCCESS',
      metadata: this.metadataFromResponse(
        response,
        event.metadataResponsePaths,
      ),
    };
  }

  private failureRecord(
    request: AuditRequest,
    event: AuditEventOptions,
  ): AuditRecordInput {
    return {
      ...this.baseRecord(request, event),
      actorUserId: request.user?.id,
      result: 'FAILURE',
    };
  }

  private baseRecord(
    request: AuditRequest,
    event: AuditEventOptions,
  ): Omit<AuditRecordInput, 'result'> {
    return {
      actorUserId: request.user?.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: undefined,
      correlationId: request.correlationId,
      ipAddress: this.ipAddress(request),
      userAgent: this.headerValue(request.headers['user-agent']),
      metadata: undefined,
    };
  }

  private metadataFromResponse(
    response: unknown,
    paths?: Record<string, string>,
  ): AuditMetadata | undefined {
    if (!paths) {
      return undefined;
    }

    const metadata: AuditMetadata = {};
    for (const [key, path] of Object.entries(paths)) {
      const value = this.valueAtPath(response, path);
      if (this.isMetadataValue(value)) {
        metadata[key] = value;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private stringAtPath(root: unknown, path?: string): string | undefined {
    if (!path) {
      return undefined;
    }
    const value = this.valueAtPath(root, path);
    return typeof value === 'string' ? value : undefined;
  }

  private valueAtPath(root: unknown, path: string): unknown {
    let current = root;

    for (const segment of path.split('.')) {
      if (
        !segment ||
        segment === '__proto__' ||
        segment === 'prototype' ||
        segment === 'constructor' ||
        typeof current !== 'object' ||
        current === null ||
        Array.isArray(current) ||
        !Object.prototype.hasOwnProperty.call(current, segment)
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  private isMetadataValue(value: unknown): value is AuditMetadataValue {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private async recordSafely(input: AuditRecordInput): Promise<void> {
    try {
      await this.auditService.record(input);
    } catch {
      this.logger.error({
        message: 'Audit event persistence failed',
        correlationId: input.correlationId,
        eventType: input.eventType,
      });
    }
  }

  private requestLog(
    request: AuditRequest,
    statusCode: number,
    startedAt: number,
    exception?: unknown,
  ): TechnicalRequestLog {
    const userAgent = this.headerValue(request.headers['user-agent']);

    return {
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
      method: request.method,
      route: this.routePath(request),
      statusCode,
      durationMs: Date.now() - startedAt,
      actorUserId: request.user?.id,
      ipAddress: this.ipAddress(request),
      userAgent,
      exceptionName:
        exception instanceof Error ? exception.constructor.name : undefined,
    };
  }

  private routePath(request: AuditRequest): string {
    const routePath = (request.route as { path?: unknown } | undefined)?.path;

    if (typeof routePath === 'string') {
      return `${request.baseUrl ?? ''}${routePath}`;
    }

    return (request.originalUrl || request.path || '/').split('?')[0];
  }

  private ipAddress(request: AuditRequest): string | undefined {
    const forwardedFor = this.headerValue(request.headers['x-forwarded-for']);
    const address = forwardedFor?.split(',')[0].trim() || request.ip;

    return address?.replace(/^::ffff:/, '');
  }

  private headerValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
