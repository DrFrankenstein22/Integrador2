import { findDates, findExpiryDate } from '../src/kyc/analysis/document-dates';

describe('findDates', () => {
  it('extrae fechas DD/MM/AAAA válidas', () => {
    const dates = findDates('NACIMIENTO 15/03/1998 EMISION 02/06/2021');
    expect(dates.map((d) => d.iso)).toEqual(['1998-03-15', '2021-06-02']);
  });

  it('acepta separadores - y .', () => {
    expect(findDates('12-11-2030').map((d) => d.iso)).toEqual(['2030-11-12']);
    expect(findDates('12.11.2030').map((d) => d.iso)).toEqual(['2030-11-12']);
  });

  it('ignora fechas imposibles (31/02) y años fuera de rango', () => {
    expect(findDates('31/02/2030')).toEqual([]);
    expect(findDates('01/01/1800')).toEqual([]);
  });

  it('ignora números sin forma de fecha (p. ej. el número de DNI)', () => {
    expect(findDates('DNI 74986754')).toEqual([]);
  });
});

describe('findExpiryDate', () => {
  it('prioriza la fecha que sigue a la etiqueta CADUCIDAD', () => {
    const lines = [
      'FECHA NACIMIENTO 15/03/1998',
      'FECHA EMISION 02/06/2021',
      'FECHA DE CADUCIDAD',
      '02/06/2029',
    ];
    expect(findExpiryDate(lines)?.iso).toBe('2029-06-02');
  });

  it('funciona si la fecha va en la misma línea que la etiqueta', () => {
    const lines = ['FECHA DE CADUCIDAD 02/06/2029'];
    expect(findExpiryDate(lines)?.iso).toBe('2029-06-02');
  });

  it('si el OCR no detectó la etiqueta, usa la fecha más lejana en el tiempo', () => {
    const lines = ['15/03/1998', '02/06/2021', '02/06/2029'];
    expect(findExpiryDate(lines)?.iso).toBe('2029-06-02');
  });

  it('devuelve null si no hay ninguna fecha', () => {
    expect(findExpiryDate(['APELLIDOS Y NOMBRES', 'PEREZ GOMEZ JUAN'])).toBeNull();
  });
});
