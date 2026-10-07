import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AccountsService } from '../src/accounts/accounts.service';
import { ObservabilityService } from '../src/observability/observability.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { OpenAccountDto } from '../src/accounts/dto/open-account.dto';
import type { ActivateAccountDto } from '../src/accounts/dto/activate-account.dto';

const PIN = '135790';
const obs = new ObservabilityService();

function baseDto(overrides: Partial<OpenAccountDto> = {}): OpenAccountDto {
  return {
    productCode: 'AHORROS',
    currency: 'PEN',
    alias: 'Mi cuenta',
    acceptedContract: true,
    pin: PIN,
    ...overrides,
  };
}

async function buildPrisma(overrides: Record<string, unknown> = {}) {
  const pinHash = await bcrypt.hash(PIN, 4);

  const prisma = {
    pinCredential: { findUnique: jest.fn().mockResolvedValue({ pinHash }) },
    account: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: { create: jest.fn() },
    ledgerEntry: { create: jest.fn() },
    accountBalanceSnapshot: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn(),
    ...overrides,
  };

  prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  prisma.account.create.mockResolvedValue({
    id: 'acc-1',
    accountNumber: '191-1111 2222 33',
    currencyCode: 'PEN',
    productCode: 'AHORROS',
    alias: 'Mi cuenta',
    statusCode: 'PENDING_ACTIVATION',
    openedAt: new Date('2026-09-02T10:00:00Z'),
  });
  prisma.transaction.create.mockResolvedValue({ id: 'tx-1' });
  prisma.ledgerEntry.create.mockResolvedValue({ id: 'le-1' });

  return prisma as unknown as PrismaService & Record<string, any>;
}

describe('AccountsService.openAccount', () => {
  it('opens a savings account as PENDING_ACTIVATION with no balance yet', async () => {
    const prisma = await buildPrisma();
    const service = new AccountsService(prisma, obs);

    const result = await service.openAccount('user-1', baseDto());

    expect(result.accountNumber).toMatch(/^191-/);
    expect(result.cci).toMatch(/^002 191 /);
    expect(result.status).toBe('PENDING_ACTIVATION');
    expect(result.availableBalance).toBe(0);
    expect(result.activationDeposit).toBe(50);
    // No se acredita nada al abrirla — recién con activateAccount.
    expect((prisma as any).ledgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown product', async () => {
    const service = new AccountsService(await buildPrisma(), obs);
    await expect(
      service.openAccount('user-1', baseDto({ productCode: 'NOPE' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a currency the product does not support', async () => {
    const service = new AccountsService(await buildPrisma(), obs);
    await expect(
      service.openAccount('user-1', baseDto({ productCode: 'SUELDO', currency: 'USD' })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects when the contract is not accepted', async () => {
    const service = new AccountsService(await buildPrisma(), obs);
    await expect(
      service.openAccount('user-1', baseDto({ acceptedContract: false })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects an incorrect PIN', async () => {
    const prisma = await buildPrisma();
    const service = new AccountsService(prisma, obs);
    await expect(
      service.openAccount('user-1', baseDto({ pin: '000000' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks the fourth account of the same product', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.count.mockResolvedValue(3);
    const service = new AccountsService(prisma, obs);
    await expect(service.openAccount('user-1', baseDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('AccountsService.getAccount', () => {
  it('throws when the account is not owned by the user', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.findFirst.mockResolvedValue(null);
    const service = new AccountsService(prisma, obs);
    await expect(service.getAccount('user-1', 'acc-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AccountsService.activateAccount', () => {
  const pendingAccount = {
    id: 'acc-1',
    accountNumber: '191-1111 2222 33',
    currencyCode: 'PEN',
    productCode: 'AHORROS',
    alias: 'Mi cuenta',
    statusCode: 'PENDING_ACTIVATION',
    openedAt: new Date('2026-09-02T10:00:00Z'),
  };

  function activateDto(overrides: Partial<ActivateAccountDto> = {}): ActivateAccountDto {
    return { pin: PIN, ...overrides };
  }

  it('credits the activation deposit and flips the account to ACTIVE', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.findFirst.mockResolvedValue(pendingAccount);
    (prisma as any).account.update.mockResolvedValue({ ...pendingAccount, statusCode: 'ACTIVE' });
    (prisma as any).accountBalanceSnapshot.findFirst.mockResolvedValue({
      availableBalance: 50,
      accountingBalance: 50,
    });

    const service = new AccountsService(prisma, obs);
    const result = await service.activateAccount('user-1', 'acc-1', activateDto());

    expect(result.status).toBe('ACTIVE');
    expect(result.availableBalance).toBe(50);
    expect(result.activationDeposit).toBe(0);
    expect((prisma as any).ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ direction: 'CREDIT' }) }),
    );
    expect((prisma as any).account.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statusCode: 'ACTIVE' } }),
    );
  });

  it('throws when the account does not exist or is not owned by the user', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.findFirst.mockResolvedValue(null);
    const service = new AccountsService(prisma, obs);
    await expect(
      service.activateAccount('user-1', 'acc-x', activateDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an account that is already active', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.findFirst.mockResolvedValue({ ...pendingAccount, statusCode: 'ACTIVE' });
    const service = new AccountsService(prisma, obs);
    await expect(
      service.activateAccount('user-1', 'acc-1', activateDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an incorrect PIN', async () => {
    const prisma = await buildPrisma();
    (prisma as any).account.findFirst.mockResolvedValue(pendingAccount);
    const service = new AccountsService(prisma, obs);
    await expect(
      service.activateAccount('user-1', 'acc-1', activateDto({ pin: '000000' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
