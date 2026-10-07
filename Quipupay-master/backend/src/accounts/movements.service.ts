import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { AccountsService } from './accounts.service';

const TYPE_LABELS: Record<string, string> = {
  INITIAL_DEPOSIT: 'Abono inicial',
  QR_PAYMENT: 'Pago QR',
  TRANSFER_IN: 'Transferencia recibida',
  TRANSFER_OUT: 'Transferencia enviada',
  SERVICE_PAYMENT: 'Pago de servicio',
  TOP_UP: 'Recarga',
};

export type MovementFilters = {
  type?: 'all' | 'in' | 'out';
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  limit?: number;
};

type MovementItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  direction: 'in' | 'out';
  typeCode: string;
  status: string;
};

function labelFor(typeCode: string): string {
  return TYPE_LABELS[typeCode] ?? 'Movimiento';
}

@Injectable()
export class MovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly config: ConfigService,
    private readonly obs: ObservabilityService,
  ) {}

  async list(userId: string, accountId: string, filters: MovementFilters) {
    await this.accounts.assertOwnership(userId, accountId);

    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const where: Prisma.LedgerEntryWhereInput = { accountId };

    if (filters.type === 'in') {
      where.direction = 'CREDIT';
    } else if (filters.type === 'out') {
      where.direction = 'DEBIT';
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) {
        where.createdAt.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.createdAt.lte = new Date(filters.to);
      }
    }

    if (filters.q?.trim()) {
      where.transaction = {
        reference: { contains: filters.q.trim(), mode: 'insensitive' },
      };
    }

    const entries = await this.obs.startSegment(
      'Datastore/statement/Postgres/ledgerEntry/findMany',
      true,
      () =>
        this.prisma.ledgerEntry.findMany({
          where,
          include: { transaction: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        }),
    );

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;
    this.obs.recordMetric('Custom/Movements/PageSize', page.length);

    return {
      items: page.map((entry) => this.toItem(entry)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async receipt(userId: string, movementId: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: movementId },
      include: {
        transaction: { include: { paymentReceipt: true } },
        account: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('El movimiento no existe');
    }

    if (entry.account.userId !== userId) {
      throw new ForbiddenException('Este movimiento no te pertenece');
    }

    const isCredit = entry.direction === 'CREDIT';
    const amount = Number(entry.amount) * (isCredit ? 1 : -1);

    return {
      id: entry.id,
      title: entry.transaction.reference ?? labelFor(entry.transaction.typeCode),
      counterparty: entry.transaction.reference ?? labelFor(entry.transaction.typeCode),
      amount,
      direction: isCredit ? 'in' : 'out',
      status: entry.transaction.statusCode,
      typeCode: entry.transaction.typeCode,
      medium: labelFor(entry.transaction.typeCode),
      accountMasked: `···${entry.account.accountNumber.replace(/\D/g, '').slice(-4)}`,
      operationNumber:
        entry.transaction.paymentReceipt?.receiptNumber ??
        entry.id.replace(/\D/g, '').slice(0, 8).padStart(8, '0'),
      date: entry.createdAt.toISOString(),
      balanceAfter: entry.balanceAfter ? Number(entry.balanceAfter) : null,
      currency: entry.currencyCode,
    };
  }

  async seedDemo(userId: string, accountId: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('No disponible en producción');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('La cuenta no existe o no te pertenece');
    }

    const now = Date.now();
    const samples: Array<{
      typeCode: string;
      direction: 'CREDIT' | 'DEBIT';
      amount: number;
      reference: string;
      daysAgo: number;
    }> = [
      { typeCode: 'QR_PAYMENT', direction: 'DEBIT', amount: 18.5, reference: 'Bodega San Martín', daysAgo: 0 },
      { typeCode: 'TRANSFER_IN', direction: 'CREDIT', amount: 320, reference: 'J. Ramos Díaz', daysAgo: 1 },
      { typeCode: 'SERVICE_PAYMENT', direction: 'DEBIT', amount: 72.3, reference: 'Recibo de luz', daysAgo: 1 },
      { typeCode: 'TRANSFER_OUT', direction: 'DEBIT', amount: 150, reference: 'Transferencia enviada', daysAgo: 7 },
      { typeCode: 'TOP_UP', direction: 'CREDIT', amount: 200, reference: 'Recarga desde otro banco', daysAgo: 12 },
    ];

    const last = await this.prisma.ledgerEntry.findFirst({
      where: { accountId },
      orderBy: [{ createdAt: 'desc' }, { entrySequence: 'desc' }],
    });

    let running = last?.balanceAfter ? Number(last.balanceAfter) : 0;
    let sequence = (last?.entrySequence ?? 0) + 1;

    for (const sample of [...samples].reverse()) {
      const delta = sample.direction === 'CREDIT' ? sample.amount : -sample.amount;
      running = Math.round((running + delta) * 100) / 100;
      const createdAt = new Date(now - sample.daysAgo * 86_400_000);

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const transaction = await tx.transaction.create({
          data: {
            userId,
            typeCode: sample.typeCode,
            statusCode: 'COMPLETED',
            amount: new Prisma.Decimal(sample.amount),
            currencyCode: account.currencyCode,
            reference: sample.reference,
            createdAt,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            accountId,
            direction: sample.direction,
            amount: new Prisma.Decimal(sample.amount),
            currencyCode: account.currencyCode,
            balanceAfter: new Prisma.Decimal(running),
            entrySequence: sequence,
            createdAt,
          },
        });
      });

      sequence += 1;
    }

    await this.prisma.accountBalanceSnapshot.create({
      data: {
        accountId,
        availableBalance: new Prisma.Decimal(running),
        accountingBalance: new Prisma.Decimal(running),
        currencyCode: account.currencyCode,
      },
    });

    return { seeded: samples.length, balance: running };
  }

  private toItem(entry: {
    id: string;
    direction: string;
    amount: Prisma.Decimal;
    createdAt: Date;
    transaction: { typeCode: string; reference: string | null; statusCode: string };
  }): MovementItem {
    const isCredit = entry.direction === 'CREDIT';
    const time = entry.createdAt.toISOString().slice(11, 16);

    return {
      id: entry.id,
      title: entry.transaction.reference ?? labelFor(entry.transaction.typeCode),
      subtitle: `${labelFor(entry.transaction.typeCode)} · ${time}`,
      date: entry.createdAt.toISOString(),
      amount: Number(entry.amount) * (isCredit ? 1 : -1),
      direction: isCredit ? 'in' : 'out',
      typeCode: entry.transaction.typeCode,
      status: entry.transaction.statusCode,
    };
  }
}
