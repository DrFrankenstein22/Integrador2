import { isWeakPin } from './pinStrength';

describe('isWeakPin', () => {
  test('rejects 123456', () => {
    expect(isWeakPin('123456')).toBe(true);
  });

  test('rejects 654321', () => {
    expect(isWeakPin('654321')).toBe(true);
  });

  test('rejects repeated digits', () => {
    expect(isWeakPin('777777')).toBe(true);
  });

  test('accepts a non predictable pin', () => {
    expect(isWeakPin('482913')).toBe(false);
  });

  test('does not flag an incomplete pin', () => {
    expect(isWeakPin('1234')).toBe(false);
  });
});
