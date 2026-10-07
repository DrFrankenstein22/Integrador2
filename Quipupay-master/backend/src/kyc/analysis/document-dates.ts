/**
 * Utilidades para ubicar la fecha de caducidad de un DNI peruano dentro de
 * texto detectado por OCR (líneas/palabras sueltas, sin estructura de
 * campos). El DNI imprime las fechas como DD/MM/AAAA (a veces con "-" o "."),
 * junto a "FECHA NACIMIENTO", "FECHA EMISIÓN" y "FECHA CADUCIDAD".
 */

const DATE_RE = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g;

export type ParsedDate = { iso: string; date: Date };

/** Extrae todas las fechas DD/MM/AAAA válidas de un texto, en orden de aparición. */
export function findDates(text: string): ParsedDate[] {
  const found: ParsedDate[] = [];
  for (const match of text.matchAll(DATE_RE)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1990 || year > 2100) {
      continue;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) {
      continue; // p. ej. 31/02/xxxx no existe
    }
    found.push({ iso: date.toISOString().slice(0, 10), date });
  }
  return found;
}

/**
 * Entre varias líneas de texto detectado (en orden de lectura, de arriba
 * hacia abajo), busca la fecha de caducidad: la que sigue a la palabra
 * "CADUC" en las 3 líneas siguientes; si no aparece esa palabra (falló el
 * OCR en leer la etiqueta), usa la fecha más lejana en el futuro entre todas
 * las encontradas (nacimiento y emisión siempre quedan en el pasado; la de
 * caducidad es la única candidata a estar en el futuro, o al menos es la más
 * reciente de las tres).
 */
export function findExpiryDate(lines: string[]): ParsedDate | null {
  const labelIndex = lines.findIndex((line) => /CADUC/i.test(line));
  if (labelIndex >= 0) {
    for (let i = labelIndex; i < Math.min(labelIndex + 4, lines.length); i += 1) {
      const dates = findDates(lines[i]);
      if (dates.length > 0) {
        return dates[0];
      }
    }
  }

  const all = lines.flatMap((line) => findDates(line));
  if (all.length === 0) {
    return null;
  }
  return all.reduce((latest, current) => (current.date > latest.date ? current : latest));
}
