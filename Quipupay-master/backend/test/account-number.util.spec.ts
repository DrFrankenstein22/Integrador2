import {
  deriveCci,
  generateAccountNumber,
} from '../src/accounts/account-number.util';

describe('account-number.util', () => {
  it('generates an account number with the expected shape', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateAccountNumber()).toMatch(/^191-\d{4} \d{4} \d{2}$/);
    }
  });

  it('derives a stable CCI from an account number', () => {
    const number = '191-2847 5063 09';
    const cci = deriveCci(number);

    expect(cci).toMatch(/^002 191 \d{12} \d{2}$/);
    expect(deriveCci(number)).toBe(cci);
    expect(cci.startsWith('002 191 002847506309 ')).toBe(true);
  });
});
