import { isValidDni, isValidEmail, isValidPeruPhone } from './validation';

describe('isValidDni', () => {
  test('accepts 8 digits', () => {
    expect(isValidDni('74128905')).toBe(true);
  });

  test('rejects fewer than 8 digits', () => {
    expect(isValidDni('7412')).toBe(false);
  });

  test('rejects non-numeric characters', () => {
    expect(isValidDni('7412890a')).toBe(false);
  });
});

describe('isValidEmail', () => {
  test('accepts a well formed email', () => {
    expect(isValidEmail('maria.quispe@correo.com')).toBe(true);
  });

  test('rejects an email without a domain', () => {
    expect(isValidEmail('maria.quispe@')).toBe(false);
  });

  test('rejects an email without an at sign', () => {
    expect(isValidEmail('maria.quispe.correo.com')).toBe(false);
  });
});

describe('isValidPeruPhone', () => {
  test('accepts a 9 digit number starting with 9', () => {
    expect(isValidPeruPhone('+51 987 654 321')).toBe(true);
  });

  test('rejects a number not starting with 9', () => {
    expect(isValidPeruPhone('+51 812 654 321')).toBe(false);
  });

  test('rejects a number with fewer than 9 digits', () => {
    expect(isValidPeruPhone('987 654')).toBe(false);
  });
});
