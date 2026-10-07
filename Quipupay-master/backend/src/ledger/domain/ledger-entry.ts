import { randomUUID } from 'node:crypto';
import { LedgerDirection } from './ledger-direction';
import { Money } from './money';

export type LedgerEntryProps = {
  id?: string;
  transactionId: string;
  accountId: string;
  direction: LedgerDirection;
  money: Money;
  createdAt?: Date;
};

export class LedgerEntry {
  readonly id: string;
  readonly transactionId: string;
  readonly accountId: string;
  readonly direction: LedgerDirection;
  readonly money: Money;
  readonly createdAt: Date;

  constructor(props: LedgerEntryProps) {
    if (!props.money.isPositive()) {
      throw new Error('Ledger entry amount must be positive');
    }

    this.id = props.id ?? randomUUID();
    this.transactionId = props.transactionId;
    this.accountId = props.accountId;
    this.direction = props.direction;
    this.money = props.money;
    this.createdAt = props.createdAt ?? new Date();
  }
}

