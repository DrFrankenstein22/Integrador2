import { LedgerEntry } from '../../ledger/domain/ledger-entry';
import { TransactionStatus } from '../../transactions/domain/transaction-status';
import { TransactionType } from '../../transactions/domain/transaction-type';

export type TransferResult = {
  transactionId: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  ledgerEntries: LedgerEntry[];
};

