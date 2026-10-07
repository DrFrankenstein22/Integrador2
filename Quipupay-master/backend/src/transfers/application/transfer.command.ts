import { Money } from '../../ledger/domain/money';

export type TransferCommandProps = {
  sourceAccountId: string;
  targetAccountId: string;
  amount: Money;
  reference?: string;
};

export class TransferCommand {
  readonly sourceAccountId: string;
  readonly targetAccountId: string;
  readonly amount: Money;
  readonly reference: string;

  constructor(props: TransferCommandProps) {
    if (props.sourceAccountId === props.targetAccountId) {
      throw new Error('Source and target accounts must be different');
    }
    if (!props.amount.isPositive()) {
      throw new Error('Transfer amount must be positive');
    }

    this.sourceAccountId = props.sourceAccountId;
    this.targetAccountId = props.targetAccountId;
    this.amount = props.amount;
    this.reference = props.reference?.trim() ?? '';
  }
}

