import { SetMetadata } from '@nestjs/common';

export const AUDIT_EVENT_METADATA = 'audit:event';

export type AuditEventOptions = {
  eventType: string;
  entityType?: string;
  actorResponsePath?: string;
  entityIdResponsePath?: string;
  metadataResponsePaths?: Record<string, string>;
};

export const AuditEvent = (options: AuditEventOptions) =>
  SetMetadata(AUDIT_EVENT_METADATA, options);
