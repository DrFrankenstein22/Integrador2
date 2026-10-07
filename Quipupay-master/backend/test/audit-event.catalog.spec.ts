import { describeAuditEvent } from '../src/audit/audit-event.catalog';

describe('describeAuditEvent', () => {
  it.each([
    [
      'USER_REGISTERED',
      {},
      'Usuario registrado',
      'El usuario completó su registro.',
    ],
    [
      'ACCOUNT_OPENED',
      { productCode: 'AHORROS', currency: 'PEN' },
      'Cuenta abierta',
      'El usuario abrió una cuenta AHORROS en PEN.',
    ],
    [
      'KYC_MATERIALIZED',
      { decision: 'APPROVED' },
      'Verificación de identidad',
      'La verificación de identidad finalizó con resultado APPROVED.',
    ],
    [
      'LOGIN_SUCCEEDED',
      {},
      'Inicio de sesión exitoso',
      'El usuario inició sesión correctamente.',
    ],
    [
      'LOGIN_FAILED',
      { reason: 'INVALID_PIN' },
      'Inicio de sesión rechazado',
      'El intento de inicio de sesión fue rechazado por INVALID_PIN.',
    ],
  ])('describes %s in Spanish', (eventType, metadata, title, description) => {
    expect(describeAuditEvent(eventType, metadata, 'SUCCESS')).toEqual({
      title,
      description,
    });
  });

  it('falls back safely when the event code is unknown', () => {
    expect(describeAuditEvent('NEW_EVENT', {}, 'SUCCESS')).toEqual({
      title: 'NEW_EVENT',
      description: 'Evento registrado por Quipupay',
    });
  });
});
