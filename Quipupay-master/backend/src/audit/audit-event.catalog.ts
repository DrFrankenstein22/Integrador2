import type { AuditMetadata } from './audit.types';

export type AuditEventDescription = {
  title: string;
  description: string;
};

function displayed(
  metadata: AuditMetadata,
  key: string,
  fallback: string,
): string {
  const value = metadata[key];
  return value === undefined || value === null ? fallback : String(value);
}

export function describeAuditEvent(
  eventType: string,
  metadata: AuditMetadata,
  result: string,
): AuditEventDescription {
  switch (eventType) {
    case 'USER_REGISTERED':
      return {
        title: 'Usuario registrado',
        description: 'El usuario completó su registro.',
      };
    case 'ACCOUNT_OPENED':
      return {
        title: 'Cuenta abierta',
        description: `El usuario abrió una cuenta ${displayed(metadata, 'productCode', 'sin tipo')} en ${displayed(metadata, 'currency', 'moneda no especificada')}.`,
      };
    case 'KYC_MATERIALIZED':
      return {
        title: 'Verificación de identidad',
        description: `La verificación de identidad finalizó con resultado ${displayed(metadata, 'decision', result)}.`,
      };
    case 'LOGIN_SUCCEEDED':
      return {
        title: 'Inicio de sesión exitoso',
        description: 'El usuario inició sesión correctamente.',
      };
    case 'LOGIN_FAILED':
      return {
        title: 'Inicio de sesión rechazado',
        description: `El intento de inicio de sesión fue rechazado por ${displayed(metadata, 'reason', result)}.`,
      };
    default:
      return {
        title: eventType,
        description: 'Evento registrado por Quipupay',
      };
  }
}
