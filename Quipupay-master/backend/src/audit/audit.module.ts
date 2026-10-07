import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditPermissionsGuard } from './audit-permissions.guard';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditPermissionsGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AuditPermissionsGuard],
})
export class AuditModule {}
