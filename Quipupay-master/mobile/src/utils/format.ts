const SYMBOLS: Record<string, string> = { PEN: 'S/', USD: 'US$' };

export function formatMoney(amount: number, currency = 'PEN'): string {
  const symbol = SYMBOLS[currency] ?? currency;
  const formatted = Math.abs(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '- ' : ''}${symbol}${formatted}`;
}

export function formatSignedAmount(amount: number): string {
  const sign = amount < 0 ? '- ' : '+ ';
  const formatted = Math.abs(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted}`;
}

export function groupLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) {
    return 'HOY';
  }
  if (sameDay(date, yesterday)) {
    return 'AYER';
  }

  return date
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    .replace('.', '')
    .toUpperCase();
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
