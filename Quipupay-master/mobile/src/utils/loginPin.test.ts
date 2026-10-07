import { evaluatePinAttempt, attemptsMessage } from './loginPin';

describe('evaluatePinAttempt', () => {
  test('succeeds with the demo PIN', () => {
    const result = evaluatePinAttempt('123456', 0);
    expect(result).toEqual({ success: true, remainingAttempts: 3, locked: false });
  });

  test('first wrong attempt leaves 2 remaining', () => {
    const result = evaluatePinAttempt('000000', 0);
    expect(result).toEqual({ success: false, remainingAttempts: 2, locked: false });
  });

  test('second wrong attempt leaves 1 remaining', () => {
    const result = evaluatePinAttempt('000000', 1);
    expect(result).toEqual({ success: false, remainingAttempts: 1, locked: false });
  });

  test('third wrong attempt locks the account', () => {
    const result = evaluatePinAttempt('000000', 2);
    expect(result).toEqual({ success: false, remainingAttempts: 0, locked: true });
  });
});

describe('attemptsMessage', () => {
  test('uses singular wording for 1 remaining attempt', () => {
    expect(attemptsMessage(1)).toBe('Clave incorrecta. Te queda 1 de 3 intentos.');
  });

  test('uses plural wording for more than 1 remaining attempt', () => {
    expect(attemptsMessage(2)).toBe('Clave incorrecta. Te quedan 2 de 3 intentos.');
  });
});
