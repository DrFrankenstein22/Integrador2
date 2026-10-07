import { formatMoney, formatSignedAmount, groupLabel } from './format';

describe('formatMoney', () => {
  it('formats soles and dollars with two decimals', () => {
    expect(formatMoney(1248.6, 'PEN')).toBe('S/1,248.60');
    expect(formatMoney(85, 'USD')).toBe('US$85.00');
  });

  it('prefixes a minus sign for negative amounts', () => {
    expect(formatMoney(-18.5, 'PEN')).toBe('- S/18.50');
  });
});

describe('formatSignedAmount', () => {
  it('uses + and - prefixes', () => {
    expect(formatSignedAmount(320)).toBe('+ 320.00');
    expect(formatSignedAmount(-72.3)).toBe('- 72.30');
  });
});

describe('groupLabel', () => {
  it('labels today and yesterday', () => {
    expect(groupLabel(new Date().toISOString())).toBe('HOY');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(groupLabel(yesterday.toISOString())).toBe('AYER');
  });
});
