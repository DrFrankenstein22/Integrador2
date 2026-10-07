import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LedgerDirection } from '../../ledger/domain/ledger-direction';
import { LedgerEntry } from '../../ledger/domain/ledger-entry';
import { ObservabilityService } from '../../observability/observability.service';
import { TransactionStatus } from '../../transactions/domain/transaction-status';
import { TransactionType } from '../../transactions/domain/transaction-type';
import { TransferCommand } from './transfer.command';
import { TransferResult } from './transfer.result';

@Injectable()
export class TransferService {
  constructor(private readonly obs: ObservabilityService) {}

  createLedgerPreview(command: TransferCommand): TransferResult {
    const transactionId = randomUUID();
    const createdAt = new Date();

    const debit = new LedgerEntry({
      transactionId,
      accountId: command.sourceAccountId,
      direction: LedgerDirection.Debit,
      money: command.amount,
      createdAt,
    });

    const credit = new LedgerEntry({
      transactionId,
      accountId: command.targetAccountId,
      direction: LedgerDirection.Credit,
      money: command.amount,
      createdAt,
    });

    this.obs.incrementMetric('Custom/Transfers/Created');
    // recordMetric da count/avg/min/max/total gratis en el dashboard.
    this.obs.recordMetric('Custom/Transfers/Amount', command.amount.amount);
    this.obs.addAttributes({ transactionId, transferCurrency: command.amount.currency });
    this.obs.recordEvent('QuipupayTransfer', {
      transactionId,
      amount: command.amount.amount,
      currency: command.amount.currency,
      transactionType: TransactionType.TransferSent,
      status: TransactionStatus.Pending,
      ledgerEntries: 2,
      // Nunca el texto de la referencia: es input libre del usuario.
      hasReference: command.reference.length > 0,
    });

    return {
      transactionId,
      transactionType: TransactionType.TransferSent,
      status: TransactionStatus.Pending,
      ledgerEntries: [debit, credit],
    };
  }
}

