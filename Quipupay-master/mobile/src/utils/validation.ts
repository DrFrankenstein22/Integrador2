export function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPeruPhone(phone: string): boolean {
  let digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('51')) {
    digits = digits.slice(2);
  }

  return /^9\d{8}$/.test(digits);
}
