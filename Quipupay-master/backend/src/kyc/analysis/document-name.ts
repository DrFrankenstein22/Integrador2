/**
 * Compara el nombre que devuelve RENIEC para un número de DNI contra el
 * texto detectado por OCR en la FOTO del documento — sin esto, alguien
 * podría escribir su propio número de DNI (válido) y fotografiar el
 * documento físico de otra persona; el resto del flujo (calidad, autenticidad,
 * incluso el match facial si además usa su propia selfie) no detectaría ese
 * caso por sí solo.
 *
 * No se busca una coincidencia exacta de cadena: el OCR de una foto de
 * celular comete errores (una tilde, un carácter confundido, saltos de
 * línea en medio del nombre), así que se compara por palabras.
 */

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes/diacríticos
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Conectores frecuentes en apellidos compuestos peruanos ("DE LA CRUZ", "DEL
// CARPIO"): no cuentan como evidencia de coincidencia por sí solos.
const STOPWORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y']);

export type NameMatch = {
  match: boolean | null;
  score: number;
};

/**
 * `score` = fracción de las palabras significativas del nombre de RENIEC
 * que aparecen en el texto detectado del documento. `match` = null si no
 * hay nombre esperado o no se detectó texto (no se pudo determinar, no
 * bloquea); si no, `score >= 0.75` (tolera que el OCR falle como máximo una
 * palabra de un nombre típico de 3-4 palabras).
 */
export function matchName(expectedFullName: string | null | undefined, documentLines: string[]): NameMatch {
  if (!expectedFullName || documentLines.length === 0) {
    return { match: null, score: 0 };
  }

  const tokens = normalize(expectedFullName)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

  if (tokens.length === 0) {
    return { match: null, score: 0 };
  }

  const haystack = normalize(documentLines.join(' '));
  const found = tokens.filter((token) => haystack.includes(token));
  const score = Number((found.length / tokens.length).toFixed(3));

  return { match: score >= 0.75, score };
}
