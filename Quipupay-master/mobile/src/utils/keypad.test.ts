import { applyKeypadInput } from './keypad';

describe('applyKeypadInput', () => {
  test('appends a digit within the max length', () => {
    expect(applyKeypadInput('12', '3', 8)).toBe('123');
  });

  test('ignores new digits once max length is reached', () => {
    expect(applyKeypadInput('12345678', '9', 8)).toBe('12345678');
  });

  test('deletes the last digit', () => {
    expect(applyKeypadInput('123', 'delete', 8)).toBe('12');
  });

  test('deleting an empty value stays empty', () => {
    expect(applyKeypadInput('', 'delete', 8)).toBe('');
  });
});
