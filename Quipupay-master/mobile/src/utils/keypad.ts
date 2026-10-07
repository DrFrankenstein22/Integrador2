export function applyKeypadInput(current: string, key: string, maxLength: number): string {
  if (key === 'delete') {
    return current.slice(0, -1);
  }

  if (current.length >= maxLength) {
    return current;
  }

  return current + key;
}
