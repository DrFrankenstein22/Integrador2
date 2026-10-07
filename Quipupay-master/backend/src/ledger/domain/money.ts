export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be finite');
    }
    if (!currency.trim()) {
      throw new Error('Money currency is required');
    }
  }

  static soles(amount: number): Money {
    return new Money(Money.round(amount), 'PEN');
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(Money.round(this.amount + other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(Money.round(this.amount - other.amount), this.currency);
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Money currencies must match');
    }
  }

  private static round(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
