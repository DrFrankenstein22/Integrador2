import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { findProduct } from '../products/products.constants';
import { OpenAccountDto } from './dto/open-account.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { deriveCci, generateAccountNumber } from './account-number.util';

const OPEN_STATUS_CODES = ['ACTIVE', 'PENDING_ACTIVATION'];
const MAX_ACCOUNTS_PER_PRODUCT = 3;
// La cuenta nace sin saldo, en PENDING_ACTIVATION — hay que depositar este
// monto (típico de una cuenta de ahorros real) para que quede ACTIVE.
const ACTIVATION_DEPOSIT: Record<string, number> = { PEN: 50, USD: 20 };

type AccountSummary = {
  id: string;
  accountNumber: string;
  cci: string;
  alias: string | null;
  currency: string;
  productCode: string;
  productName: string;
  status: string;
  availableBalance: number;
  accountingBalance: number;
  /** Cuánto falta depositar para activarla — 0 si ya está ACTIVE. */
  activationDeposit: number;
  openedAt: Date;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: ObservabilityService,
  ) {}

  async openAccount(userId: string, dto: OpenAccountDto): Promise<AccountSummary> {
    const product = findProduct(dto.productCode);

    if (!product) {
      throw new NotFoundException('El producto solicitado no existe');
    }

    if (!product.currencies.includes(dto.currency)) {
      throw new UnprocessableEntityException(
        `El producto ${product.name} no admite la moneda ${dto.currency}`,
      );
    }

    if (!dto.acceptedContract) {
      throw new UnprocessableEntityException(
        'Debes aceptar el contrato de la cuenta para continuar',
      );
    }

    await this.assertPin(userId, dto.pin);

    const openCount = await this.prisma.account.count({
      where: {
        userId,
        productCode: product.code,
        statusCode: { in: OPEN_STATUS_CODES },
      },
    });

    if (openCount >= MAX_ACCOUNTS_PER_PRODUCT) {
      throw new ConflictException(
        `Ya tienes ${MAX_ACCOUNTS_PER_PRODUCT} cuentas de ${product.name}. No puedes abrir otra.`,
      );
    }

    const accountNumber = await this.generateUniqueAccountNumber();

    // La cuenta nace SIN saldo y PENDING_ACTIVATION — todavía no es una
    // cuenta operativa. Recién queda ACTIVE cuando el titular deposita el
    // monto de activación (`activateAccount`). No se crea ningún
    // movimiento/snapshot acá: sin snapshot, `toSummary` ya reporta 0.
    const account = await this.obs.startSegment(
      'Datastore/statement/Postgres/account/create',
      true,
      () =>
        this.prisma.account.create({
          data: {
            userId,
            accountNumber,
            currencyCode: dto.currency,
            productCode: product.code,
            alias: dto.alias?.trim() || null,
            statusCode: 'PENDING_ACTIVATION',
          },
        }),
    );

    this.obs.incrementMetric('Custom/Accounts/Opened');
    this.obs.recordEvent('QuipupayAccountOpened', {
      productCode: product.code,
      currency: dto.currency,
      userId,
    });

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      cci: deriveCci(account.accountNumber),
      alias: account.alias,
      currency: account.currencyCode,
      productCode: account.productCode,
      productName: product.name,
      status: account.statusCode,
      availableBalance: 0,
      accountingBalance: 0,
      activationDeposit: ACTIVATION_DEPOSIT[dto.currency] ?? 0,
      openedAt: account.openedAt,
    };
  }

  /**
   * Activa una cuenta PENDING_ACTIVATION con el depósito inicial (HU03b).
   * El monto es fijo por moneda, no lo manda el cliente — evita que alguien
   * intente "activar" con un monto distinto al que exige la política.
   */
  async activateAccount(userId: string, accountId: string, dto: ActivateAccountDto): Promise<AccountSummary> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('La cuenta no existe o no te pertenece');
    }

    if (account.statusCode !== 'PENDING_ACTIVATION') {
      throw new ConflictException('Esta cuenta ya está activa');
    }

    await this.assertPin(userId, dto.pin);

    const deposit = ACTIVATION_DEPOSIT[account.currencyCode] ?? 0;

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          typeCode: 'INITIAL_DEPOSIT',
          statusCode: 'COMPLETED',
          amount: new Prisma.Decimal(deposit),
          currencyCode: account.currencyCode,
          reference: 'Depósito de activación',
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
          direction: 'CREDIT',
          amount: new Prisma.Decimal(deposit),
          currencyCode: account.currencyCode,
          balanceAfter: new Prisma.Decimal(deposit),
          entrySequence: 1,
        },
      });

      await tx.accountBalanceSnapshot.create({
        data: {
          accountId: account.id,
          availableBalance: new Prisma.Decimal(deposit),
          accountingBalance: new Prisma.Decimal(deposit),
          currencyCode: account.currencyCode,
          ledgerEntryId: entry.id,
        },
      });

      return tx.account.update({
        where: { id: account.id },
        data: { statusCode: 'ACTIVE' },
      });
    });

    return this.toSummary(updated);
  }

  async listAccounts(userId: string): Promise<AccountSummary[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { openedAt: 'asc' },
    });

    return Promise.all(accounts.map((account) => this.toSummary(account)));
  }

  async getAccount(userId: string, accountId: string): Promise<AccountSummary> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('La cuenta no existe o no te pertenece');
    }

    return this.toSummary(account);
  }

  async assertOwnership(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException('La cuenta no existe o no te pertenece');
    }
  }

  private async assertPin(userId: string, pin: string): Promise<void> {
    const credential = await this.prisma.pinCredential.findUnique({
      where: { userId },
    });

    if (!credential || !(await bcrypt.compare(pin, credential.pinHash))) {
      throw new UnauthorizedException('La clave ingresada no es correcta');
    }
  }

  private async generateUniqueAccountNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateAccountNumber();
      const existing = await this.prisma.account.findUnique({
        where: { accountNumber: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('No fue posible generar un número de cuenta único');
  }

  private async toSummary(account: {
    id: string;
    accountNumber: string;
    alias: string | null;
    currencyCode: string;
    productCode: string;
    statusCode: string;
    openedAt: Date;
  }): Promise<AccountSummary> {
    const snapshot = await this.prisma.accountBalanceSnapshot.findFirst({
      where: { accountId: account.id },
      orderBy: { calculatedAt: 'desc' },
    });

    const product = findProduct(account.productCode);

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      cci: deriveCci(account.accountNumber),
      alias: account.alias,
      currency: account.currencyCode,
      productCode: account.productCode,
      productName: product?.name ?? account.productCode,
      status: account.statusCode,
      availableBalance: snapshot ? Number(snapshot.availableBalance) : 0,
      accountingBalance: snapshot ? Number(snapshot.accountingBalance) : 0,
      activationDeposit:
        account.statusCode === 'PENDING_ACTIVATION' ? (ACTIVATION_DEPOSIT[account.currencyCode] ?? 0) : 0,
      openedAt: account.openedAt,
    };
  }
}
