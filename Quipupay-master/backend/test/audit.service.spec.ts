import { BadRequestException } from '@nestjs/common';

import {
  decodeAuditCursor,
  encodeAuditCursor,
} from '../src/audit/audit-cursor';
import {
  AuditService,
  maskDni,
  normalizeAudit,
  normalizeLogin,
} from '../src/audit/audit.service';
import type { PrismaService } from '../src/prisma/prisma.service';

const ACTOR = {
  id: '005825ec-394d-44a7-874f-b5c1a36236b1',
  dni: '12345678',
  profile: { firstName: 'Ada', lastName: 'Lovelace' },
};

function auditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    actorUserId: ACTOR.id,
    eventType: 'ACCOUNT_OPENED',
    entityType: 'account',
    entityId: '20000000-0000-4000-8000-000000000001',
    correlationId: '30000000-0000-4000-8000-000000000001',
    result: 'SUCCESS',
    ipAddress: '10.0.0.1',
    userAgent: 'Quipupay test',
    metadata: {
      productCode: 'AHORROS',
      currency: 'PEN',
      nestedSecret: { pin: '135790' },
    },
    createdAt: new Date('2026-09-09T12:00:00.000Z'),
    actor: ACTOR,
    ...overrides,
  };
}

function loginRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '40000000-0000-4000-8000-000000000001',
    userId: ACTOR.id,
    channel: 'MOBILE_PIN',
    result: 'SUCCESS',
    failureReason: null,
    ipAddress: '10.0.0.2',
    userAgent: 'Android',
    createdAt: new Date('2026-09-09T11:00:00.000Z'),
    user: ACTOR,
    device: { platform: 'android' },
    ...overrides,
  };
}

function serviceHarness() {
  const prisma = {
    auditEvent: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    loginAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
  };

  return {
    prisma,
    service: new AuditService(prisma as unknown as PrismaService),
  };
}

describe('audit normalization', () => {
  it('round-trips an opaque cursor and rejects malformed input', () => {
    const tuple = {
      createdAt: '2026-09-09T11:00:00.000Z',
      source: 'login' as const,
      id: '40000000-0000-4000-8000-000000000001',
    };

    expect(decodeAuditCursor(encodeAuditCursor(tuple))).toEqual(tuple);
    expect(() => decodeAuditCursor('not-valid-base64-json')).toThrow(
      BadRequestException,
    );
  });

  it('masks identity and normalizes both event sources', () => {
    expect(maskDni('12345678')).toBe('••••5678');
    expect(
      normalizeAudit(auditRow()).metadata,
    ).toEqual({ productCode: 'AHORROS', currency: 'PEN' });
    expect(normalizeAudit(auditRow())).toEqual(
      expect.objectContaining({
        source: 'audit',
        eventType: 'ACCOUNT_OPENED',
        title: 'Cuenta abierta',
        description: 'El usuario abrió una cuenta AHORROS en PEN.',
        actor: {
          id: ACTOR.id,
          displayName: 'Ada Lovelace',
          maskedDni: '••••5678',
        },
      }),
    );
    expect(normalizeLogin(loginRow()).eventType).toBe('LOGIN_SUCCEEDED');
    expect(
      normalizeLogin(
        loginRow({ result: 'FAILURE', failureReason: 'INVALID_PIN' }),
      ),
    ).toEqual(
      expect.objectContaining({
        source: 'login',
        eventType: 'LOGIN_FAILED',
        correlationId: null,
        description:
          'El intento de inicio de sesión fue rechazado por INVALID_PIN.',
      }),
    );
  });

  it('uses a masked fallback when a user has no profile', () => {
    const event = normalizeAudit(
      auditRow({ actor: { ...ACTOR, profile: null } }),
    );
    expect(event.actor?.displayName).toBe('Usuario ••••5678');
  });
});

describe('AuditService administrative queries', () => {
  it('merges both sources newest-first with a stable cursor', async () => {
    const { prisma, service } = serviceHarness();
    const oldestAudit = auditRow({
      id: '10000000-0000-4000-8000-000000000002',
      createdAt: new Date('2026-09-09T10:00:00.000Z'),
    });
    prisma.auditEvent.findMany.mockResolvedValue([auditRow(), oldestAudit]);
    prisma.loginAttempt.findMany.mockResolvedValue([loginRow()]);

    const page = await service.listEvents({ limit: 2 });

    expect(page.items.map(({ source, id }) => `${source}:${id}`)).toEqual([
      'audit:10000000-0000-4000-8000-000000000001',
      'login:40000000-0000-4000-8000-000000000001',
    ]);
    expect(decodeAuditCursor(page.nextCursor!)).toEqual({
      createdAt: '2026-09-09T11:00:00.000Z',
      source: 'login',
      id: '40000000-0000-4000-8000-000000000001',
    });
  });

  it('orders audit before login and IDs descending when timestamps tie', async () => {
    const { prisma, service } = serviceHarness();
    const tiedAt = new Date('2026-09-09T12:00:00.000Z');
    prisma.auditEvent.findMany.mockResolvedValue([
      auditRow({
        id: '10000000-0000-4000-8000-000000000002',
        createdAt: tiedAt,
      }),
      auditRow({
        id: '10000000-0000-4000-8000-000000000001',
        createdAt: tiedAt,
      }),
    ]);
    prisma.loginAttempt.findMany.mockResolvedValue([
      loginRow({ createdAt: tiedAt }),
    ]);

    const page = await service.listEvents({ limit: 25 });

    expect(page.items.map(({ source, id }) => `${source}:${id}`)).toEqual([
      'audit:10000000-0000-4000-8000-000000000002',
      'audit:10000000-0000-4000-8000-000000000001',
      'login:40000000-0000-4000-8000-000000000001',
    ]);
  });

  it('rejects a reversed date range before querying the database', async () => {
    const { prisma, service } = serviceHarness();

    await expect(
      service.listEvents({
        limit: 25,
        from: '2026-09-10T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.loginAttempt.findMany).not.toHaveBeenCalled();
  });

  it('maps filters to the appropriate source without inventing login correlation IDs', async () => {
    const { prisma, service } = serviceHarness();
    await service.listEvents({
      limit: 25,
      actorUserId: ACTOR.id,
      eventType: 'LOGIN_FAILED',
      result: 'FAILURE',
      correlationId: '30000000-0000-4000-8000-000000000001',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-10T00:00:00.000Z',
    });

    expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.loginAttempt.findMany).not.toHaveBeenCalled();
  });

  it('counts both sources and unique active actors in the summary', async () => {
    const { prisma, service } = serviceHarness();
    prisma.auditEvent.groupBy.mockResolvedValue([
      { result: 'SUCCESS', _count: { _all: 2 } },
      { result: 'FAILURE', _count: { _all: 1 } },
      { result: 'APPROVED', _count: { _all: 1 } },
    ]);
    prisma.loginAttempt.groupBy.mockResolvedValue([
      { result: 'SUCCESS', _count: { _all: 3 } },
      { result: 'FAILURE', _count: { _all: 2 } },
    ]);
    prisma.auditEvent.findMany.mockResolvedValue([
      { actorUserId: ACTOR.id },
      { actorUserId: '005825ec-394d-44a7-874f-b5c1a36236b2' },
      { actorUserId: null },
    ]);
    prisma.loginAttempt.findMany.mockResolvedValue([
      { userId: '005825ec-394d-44a7-874f-b5c1a36236b2' },
      { userId: '005825ec-394d-44a7-874f-b5c1a36236b3' },
    ]);

    await expect(
      service.getSummary({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-10T00:00:00.000Z',
      }),
    ).resolves.toEqual({
      totalEvents: 9,
      successfulEvents: 6,
      failedEvents: 3,
      activeUsers: 3,
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-10T00:00:00.000Z',
    });
  });

  it('returns masked users for exact DNI searches', async () => {
    const { prisma, service } = serviceHarness();
    prisma.user.findMany.mockResolvedValue([
      {
        ...ACTOR,
        statusCode: 'ACTIVE',
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        auditEvents: [{ createdAt: new Date('2026-09-09T12:00:00.000Z') }],
        loginAttempts: [{ createdAt: new Date('2026-09-09T11:00:00.000Z') }],
        pinCredential: { pinHash: 'must-not-leak' },
      },
    ]);

    const page = await service.listUsers({ query: '12345678', limit: 25 });

    expect(page.items).toEqual([
      {
        id: ACTOR.id,
        displayName: 'Ada Lovelace',
        maskedDni: '••••5678',
        status: 'ACTIVE',
        lastActivityAt: '2026-09-09T12:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(page)).not.toContain('12345678');
    expect(JSON.stringify(page)).not.toContain('must-not-leak');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ dni: '12345678' }] } }),
    );
  });

  it('returns a sanitized per-user activity header and timeline', async () => {
    const { prisma, service } = serviceHarness();
    prisma.user.findUnique.mockResolvedValue({
      ...ACTOR,
      statusCode: 'ACTIVE',
      pinCredential: { pinHash: 'must-not-leak' },
      refreshTokens: [{ tokenHash: 'must-not-leak' }],
      biometricEnrollments: [{ template: 'must-not-leak' }],
    });
    prisma.auditEvent.findMany.mockResolvedValue([auditRow()]);
    prisma.auditEvent.count.mockResolvedValue(1);
    prisma.loginAttempt.count.mockResolvedValue(2);
    prisma.auditEvent.findFirst.mockResolvedValue({
      createdAt: new Date('2026-09-09T12:00:00.000Z'),
      ipAddress: '10.0.0.1',
    });
    prisma.loginAttempt.findFirst.mockResolvedValue({
      createdAt: new Date('2026-09-09T11:00:00.000Z'),
      ipAddress: '10.0.0.2',
    });

    const result = await service.getUserActivity(ACTOR.id, { limit: 25 });
    const serialized = JSON.stringify(result);

    expect(result.user).toEqual({
      id: ACTOR.id,
      displayName: 'Ada Lovelace',
      maskedDni: '••••5678',
      status: 'ACTIVE',
      lastActivityAt: '2026-09-09T12:00:00.000Z',
      recentIpAddress: '10.0.0.1',
      eventCount: 3,
    });
    expect(serialized).not.toContain('12345678');
    expect(serialized).not.toContain('must-not-leak');
    expect(serialized).not.toContain('pinHash');
    expect(serialized).not.toContain('tokenHash');
    expect(serialized).not.toContain('biometric');
  });
});
