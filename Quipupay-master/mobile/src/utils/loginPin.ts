export const MAX_LOGIN_ATTEMPTS = 3;
export const LOGIN_PIN_LENGTH = 6;
export const DEMO_CORRECT_PIN = '123456';

export type PinAttemptResult = {
  success: boolean;
  remainingAttempts: number;
  locked: boolean;
};

export function evaluatePinAttempt(pin: string, attemptsUsed: number): PinAttemptResult {
  if (pin === DEMO_CORRECT_PIN) {
    return { success: true, remainingAttempts: MAX_LOGIN_ATTEMPTS - attemptsUsed, locked: false };
  }

  const nextAttemptsUsed = attemptsUsed + 1;
  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - nextAttemptsUsed);

  return {
    success: false,
    remainingAttempts,
    locked: remainingAttempts === 0,
  };
}

export function attemptsMessage(remainingAttempts: number): string {
  return remainingAttempts === 1
    ? 'Clave incorrecta. Te queda 1 de 3 intentos.'
    : `Clave incorrecta. Te quedan ${remainingAttempts} de 3 intentos.`;
}
