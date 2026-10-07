import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { MovementsService } from '../src/accounts/movements.service';
import { ObservabilityService } from '../src/observability/observability.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { AccountsService } from '../src/accounts/accounts.service';
import type { ConfigService } from '@nestjs/config';

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'le-1',
    direction: 'DEBIT',
    amount: 18.5,
    balanceAfter: 31.5,
    currencyCode: 'PEN',
    createdAt: new Date('2026-09-02T09:12:00Z'),
    transaction: { typeCode: 'QR_PAYMENT', reference: 'Bodega San Martín', statusCode: 'COMPLETED' },
    ...overrides,
  };
}

const accounts = { assertOwnership: jest.fn().mockResolvedValue(undefined) } as unknown as AccountsService;
const config = { get: () => 'test' } as unknown as ConfigService;
const obs = new ObservabilityService();

describe('MovementsService.list', () => {
  it('maps ledger entries to signed movement items and paginates', async () => {
    const prisma = {
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c' })]),
      },
    } as unknown as PrismaService;

    const service = new MovementsService(prisma, accounts, config, obs);
    const result = await service.list('user-1', 'acc-1', { limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].amount).toBe(-18.5);
    expect(result.items[0].direction).toBe('out');
    expect(result.items[0].subtitle).toContain('Pago QR');
    expect(result.nextCursor).toBe('b');
  });

  it('filters by direction when type=in', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { ledgerEntry: { findMany } } as unknown as PrismaService;

    await new MovementsService(prisma, accounts, config, obs).list('user-1', 'acc-1', { type: 'in' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ direction: 'CREDIT' }) }),
    );
  });
});

describe('MovementsService.receipt', () => {
  it('rejects a movement that belongs to another user', async () => {
    const prisma = {
      ledgerEntry: {
        findUnique: jest.fn().mockResolvedValue({
          ...entry(),
          transaction: { ...entry().transaction, paymentReceipt: null },
          account: { userId: 'someone-else', accountNumber: '191-1111 2222 33' },
        }),
      },
    } as unknown as PrismaService;

    await expect(
      new MovementsService(prisma, accounts, config, obs).receipt('user-1', 'le-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when the movement does not exist', async () => {
    const prisma = {
      ledgerEntry: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    await expect(
      new MovementsService(prisma, accounts, config, obs).receipt('user-1', 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('MovementsService.seedDemo', () => {
  it('is blocked in production', async () => {
    const prodConfig = { get: () => 'production' } as unknown as ConfigService;
    const prisma = {} as unknown as PrismaService;

    await expect(
      new MovementsService(prisma, accounts, prodConfig, obs).seedDemo('user-1', 'acc-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
