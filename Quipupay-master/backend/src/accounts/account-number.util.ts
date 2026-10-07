const BANK_CODE = '002';
const BRANCH_CODE = '191';

function randomDigits(length: number): string {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}

function controlDigits(body: string): string {
  const sum = body
    .split('')
    .reduce((total, digit) => total + Number(digit) * 7, 0);
  return String(sum % 100).padStart(2, '0');
}

/**
 * Numero de cuenta simulado con formato "191-#### #### ##" (13 digitos:
 * 3 de agencia + 10 de cuenta).
 */
export function generateAccountNumber(): string {
  const body = randomDigits(10);
  return `${BRANCH_CODE}-${body.slice(0, 4)} ${body.slice(4, 8)} ${body.slice(8, 10)}`;
}

/**
 * Deriva el CCI interbancario a partir del numero de cuenta:
 * "002 191 <cuenta a 12 digitos> <control 2 digitos>".
 */
export function deriveCci(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  const accountBody = digits.slice(BRANCH_CODE.length).padStart(12, '0');
  const check = controlDigits(`${BANK_CODE}${BRANCH_CODE}${accountBody}`);
  return `${BANK_CODE} ${BRANCH_CODE} ${accountBody} ${check}`;
}
