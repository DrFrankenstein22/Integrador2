import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_METADATA = 'audit:required-permission';

export const RequirePermission = (code: string) =>
  SetMetadata(REQUIRED_PERMISSION_METADATA, code);
