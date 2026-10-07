import { BadRequestException, Logger } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';

import { AuditEvent } from '../src/audit/audit-event.decorator';
import { AuditInterceptor } from '../src/audit/audit.interceptor';
import { resolveCorrelationId } from '../src/audit/audit-request';
import { AuditService } from '../src/audit/audit.service';
import type { PrismaService } from '../src/prisma/prisma.service';

const VALID_CORRELATION_ID = '4d0e8f65-1ceb-4f8d-9d73-9b4f5633cc20';

type RequestDouble = {
  method: string;
  originalUrl: string;
  baseUrl: string;
  route: { path: string };
  headers: Record<string, string>;
  body: { pin: string };
  ip: string;
  user?: { id: string; dni: string };
  correlationId?: string;
};

class EventHandlers {
  undecorated() {}

  @AuditEvent({
    eventType: 'USER_REGISTERED',
    actorResponsePath: 'user.id',
  })
  register() {}

  @AuditEvent({
    eventType: 'ACCOUNT_OPENED',
    entityType: 'account',
    entityIdResponsePath: 'id',
    metadataResponsePaths: {
      productCode: 'productCode',
      currency: 'currency',
    },
  })
  openAccount() {}
}

function httpContext(
  request: RequestDouble,
  response: object,
  handler: (...args: never[]) => unknown = EventHandlers.prototype.undecorated,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => EventHandlers,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function requestDouble(correlationId: string): RequestDouble {
  return {
    method: 'GET',
    originalUrl: '/api/v1/accounts?cursor=private-cursor',
    baseUrl: '/api/v1',
    route: { path: '/accounts' },
    headers: {
      authorization: 'Bearer secret',
      'user-agent': 'Jest client',
      'x-correlation-id': correlationId,
    },
    body: { pin: '135790' },
    ip: '::ffff:127.0.0.1',
    user: { id: 'user-1', dni: '12345678' },
  };
}

describe('AuditInterceptor', () => {
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;
  let auditCreate: jest.Mock;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    auditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const prisma = {
      auditEvent: { create: auditCreate },
    } as unknown as PrismaService;
    interceptor = new AuditInterceptor(
      new Reflector(),
      new AuditService(prisma),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves a valid correlation ID and logs only safe request metadata', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 200, setHeader: jest.fn() };
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(httpContext(request, response), next)),
    ).resolves.toEqual({ ok: true });

    expect(request.correlationId).toBe(VALID_CORRELATION_ID);
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      VALID_CORRELATION_ID,
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: VALID_CORRELATION_ID,
        method: 'GET',
        route: '/api/v1/accounts',
        statusCode: 200,
        actorUserId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest client',
      }),
    );

    const serializedLogs = JSON.stringify(log.mock.calls);
    expect(serializedLogs).not.toContain('Bearer secret');
    expect(serializedLogs).not.toContain('135790');
    expect(serializedLogs).not.toContain('private-cursor');
    expect(serializedLogs).not.toContain('12345678');
  });

  it('replaces malformed and array correlation headers with generated UUIDs', () => {
    expect(resolveCorrelationId('not-a-uuid')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(resolveCorrelationId([VALID_CORRELATION_ID])).not.toBe(
      VALID_CORRELATION_ID,
    );
  });

  it('logs an HTTP exception and rethrows the original instance', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 200, setHeader: jest.fn() };
    const exception = new BadRequestException('invalid input');
    const next = {
      handle: () => throwError(() => exception),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(httpContext(request, response), next)),
    ).rejects.toBe(exception);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: VALID_CORRELATION_ID,
        route: '/api/v1/accounts',
        statusCode: 400,
        exceptionName: 'BadRequestException',
      }),
    );
  });

  it('does not persist a business event for an undecorated handler', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 200, setHeader: jest.fn() };

    await lastValueFrom(
      interceptor.intercept(
        httpContext(request, response, EventHandlers.prototype.undecorated),
        { handle: () => of({ ok: true }) },
      ),
    );

    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('reads a newly registered actor only from the declared response path', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 201, setHeader: jest.fn() };
    const registration = {
      message: 'ok',
      user: {
        id: '7cd021f5-65a0-4393-9498-d987130a90d8',
        dni: '12345678',
        phone: '999999999',
      },
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          httpContext(request, response, EventHandlers.prototype.register),
          { handle: () => of(registration) },
        ),
      ),
    ).resolves.toBe(registration);

    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: '7cd021f5-65a0-4393-9498-d987130a90d8',
        eventType: 'USER_REGISTERED',
        entityType: undefined,
        entityId: undefined,
        correlationId: VALID_CORRELATION_ID,
        result: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest client',
        metadata: undefined,
      },
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain('12345678');
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain('999999999');
  });

  it('persists only allowlisted account metadata and the declared entity ID', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 201, setHeader: jest.fn() };
    const account = {
      id: '63df2d75-1aac-40bb-a8a8-73d926e57c83',
      accountNumber: 'secret-account-number',
      productCode: 'AHORROS',
      currency: 'PEN',
    };

    await lastValueFrom(
      interceptor.intercept(
        httpContext(request, response, EventHandlers.prototype.openAccount),
        { handle: () => of(account) },
      ),
    );

    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'user-1',
        eventType: 'ACCOUNT_OPENED',
        entityType: 'account',
        entityId: '63df2d75-1aac-40bb-a8a8-73d926e57c83',
        correlationId: VALID_CORRELATION_ID,
        result: 'SUCCESS',
        metadata: { productCode: 'AHORROS', currency: 'PEN' },
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain(
      'secret-account-number',
    );
  });

  it('records a failed decorated action without serializing its request body', async () => {
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 201, setHeader: jest.fn() };
    const exception = new BadRequestException('invalid account');

    await expect(
      lastValueFrom(
        interceptor.intercept(
          httpContext(request, response, EventHandlers.prototype.openAccount),
          { handle: () => throwError(() => exception) },
        ),
      ),
    ).rejects.toBe(exception);

    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'user-1',
        eventType: 'ACCOUNT_OPENED',
        entityType: 'account',
        entityId: undefined,
        correlationId: VALID_CORRELATION_ID,
        result: 'FAILURE',
        metadata: undefined,
      }),
    });
    const serializedWrite = JSON.stringify(auditCreate.mock.calls);
    expect(serializedWrite).not.toContain('135790');
    expect(serializedWrite).not.toContain('Bearer secret');
  });

  it('keeps the successful business response when audit persistence fails', async () => {
    auditCreate.mockRejectedValueOnce(new Error('database unavailable'));
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 201, setHeader: jest.fn() };
    const account = {
      id: '63df2d75-1aac-40bb-a8a8-73d926e57c83',
      productCode: 'AHORROS',
      currency: 'PEN',
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          httpContext(request, response, EventHandlers.prototype.openAccount),
          { handle: () => of(account) },
        ),
      ),
    ).resolves.toBe(account);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Audit event persistence failed',
        correlationId: VALID_CORRELATION_ID,
        eventType: 'ACCOUNT_OPENED',
      }),
    );
  });

  it('rethrows the business exception when failure auditing also fails', async () => {
    auditCreate.mockRejectedValueOnce(new Error('database unavailable'));
    const request = requestDouble(VALID_CORRELATION_ID);
    const response = { statusCode: 201, setHeader: jest.fn() };
    const exception = new BadRequestException('invalid account');

    await expect(
      lastValueFrom(
        interceptor.intercept(
          httpContext(request, response, EventHandlers.prototype.openAccount),
          { handle: () => throwError(() => exception) },
        ),
      ),
    ).rejects.toBe(exception);
  });
});
