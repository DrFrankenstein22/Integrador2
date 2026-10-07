import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../auth/jwt-auth.guard';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuditRequest extends Request {
  user?: AuthenticatedUser;
  correlationId: string;
}

export function resolveCorrelationId(value: unknown): string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : randomUUID();
}
