import { Money } from '../src/ledger/domain/money';

describe('Money', () => {
  it('adds money with same currency', () => {
    const first = Money.soles(20.1);
    const second = Money.soles(10.2);

    const result = first.add(second);

    expect(result.amount).toBe(30.3);
    expect(result.currency).toBe('PEN');
  });

  it('rejects different currencies', () => {
    const soles = Money.soles(20);
    const dollars = new Money(10, 'USD');

    expect(() => soles.add(dollars)).toThrow('Money currencies must match');
  });
});
