export function isWeakPin(pin: string): boolean {
  if (pin.length !== 6) {
    return false;
  }

  const allSameDigit = pin.split('').every((digit) => digit === pin[0]);
  const isSequential = pin === '123456' || pin === '654321';

  return allSameDigit || isSequential;
}
