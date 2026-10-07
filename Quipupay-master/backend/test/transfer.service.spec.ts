import { randomUUID } from 'node:crypto';
import { LedgerDirection } from '../src/ledger/domain/ledger-direction';
import { Money } from '../src/ledger/domain/money';
import { TransactionStatus } from '../src/transactions/domain/transaction-status';
import { TransactionType } from '../src/transactions/domain/transaction-type';
import { TransferCommand } from '../src/transfers/application/transfer.command';
import { TransferService } from '../src/transfers/application/transfer.service';
import { ObservabilityService } from '../src/observability/observability.service';

describe('TransferService', () => {
  const service = new TransferService(new ObservabilityService());

  it('creates debit and credit ledger entries for transfer', () => {
    const command = new TransferCommand({
      sourceAccountId: randomUUID(),
      targetAccountId: randomUUID(),
      amount: Money.soles(300),
      reference: 'Pago academico',
    });

    const result = service.createLedgerPreview(command);

    expect(result.transactionId).toBeDefined();
    expect(result.transactionType).toBe(TransactionType.TransferSent);
    expect(result.status).toBe(TransactionStatus.Pending);
    expect(result.ledgerEntries).toHaveLength(2);
    expect(result.ledgerEntries.map((entry) => entry.direction)).toEqual([
      LedgerDirection.Debit,
      LedgerDirection.Credit,
    ]);
    expect(result.ledgerEntries.every((entry) => entry.transactionId === result.transactionId)).toBe(true);
  });

  it('rejects transfer to same account', () => {
    const accountId = randomUUID();

    expect(
      () =>
        new TransferCommand({
          sourceAccountId: accountId,
          targetAccountId: accountId,
          amount: Money.soles(50),
        }),
    ).toThrow('Source and target accounts must be different');
  });
});

