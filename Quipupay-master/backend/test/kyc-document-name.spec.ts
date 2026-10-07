import { matchName } from '../src/kyc/analysis/document-name';

describe('matchName', () => {
  it('coincide cuando todas las palabras del nombre están en el documento', () => {
    const lines = ['APELLIDOS Y NOMBRES', 'PEREZ GOMEZ', 'JUAN CARLOS'];
    const result = matchName('PEREZ GOMEZ JUAN CARLOS', lines);
    expect(result.match).toBe(true);
    expect(result.score).toBe(1);
  });

  it('tolera errores de OCR en como máximo una palabra', () => {
    // "GOMEZ" salió mal leído por el OCR (p. ej. "G0MEZ"), pero el resto coincide.
    const lines = ['PEREZ G0MEZ', 'JUAN CARLOS'];
    const result = matchName('PEREZ GOMEZ JUAN CARLOS', lines);
    expect(result.match).toBe(true);
    expect(result.score).toBeCloseTo(0.75, 2);
  });

  it('no coincide si el nombre es de otra persona', () => {
    const lines = ['APELLIDOS Y NOMBRES', 'RAMIREZ TORRES', 'MARIA ELENA'];
    const result = matchName('PEREZ GOMEZ JUAN CARLOS', lines);
    expect(result.match).toBe(false);
    expect(result.score).toBe(0);
  });

  it('ignora acentos y mayúsculas/minúsculas', () => {
    const lines = ['perez gómez', 'juan carlos'];
    const result = matchName('Pérez Gómez Juan Cárlos', lines);
    expect(result.match).toBe(true);
  });

  it('ignora conectores como DE/DEL/LA en apellidos compuestos', () => {
    const lines = ['DE LA CRUZ RAMOS', 'ANA SOFIA'];
    const result = matchName('DE LA CRUZ RAMOS ANA SOFIA', lines);
    expect(result.match).toBe(true);
  });

  it('devuelve match null si no hay nombre esperado o no hay texto detectado', () => {
    expect(matchName(null, ['ALGO'])).toEqual({ match: null, score: 0 });
    expect(matchName('PEREZ GOMEZ', [])).toEqual({ match: null, score: 0 });
  });
});
