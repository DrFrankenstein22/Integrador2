import { BadRequestException } from '@nestjs/common';

import type { ActivitySource } from './audit.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuditCursor = {
  createdAt: string;
  source: ActivitySource;
  id: string;
};

export function encodeAuditCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeAuditCursor(value: string): AuditCursor {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    if (!isAuditCursor(decoded)) {
      throw new Error('invalid shape');
    }
    return decoded;
  } catch {
    throw new BadRequestException('El cursor de auditoría no es válido');
  }
}

function isAuditCursor(value: unknown): value is AuditCursor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const cursor = value as Record<string, unknown>;
  const createdAt =
    typeof cursor.createdAt === 'string' ? new Date(cursor.createdAt) : null;

  return (
    Object.keys(cursor).length === 3 &&
    createdAt !== null &&
    !Number.isNaN(createdAt.getTime()) &&
    createdAt.toISOString() === cursor.createdAt &&
    (cursor.source === 'audit' || cursor.source === 'login') &&
    typeof cursor.id === 'string' &&
    UUID_PATTERN.test(cursor.id)
  );
}
