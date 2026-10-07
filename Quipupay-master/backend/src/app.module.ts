import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { TransfersModule } from './transfers/transfers.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './identity/identity.module';
import { ProductsModule } from './products/products.module';
import { AccountsModule } from './accounts/accounts.module';
import { KycModule } from './kyc/kyc.module';
import { AuditModule } from './audit/audit.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    TransfersModule,
    AuthModule,
    PrismaModule,
    IdentityModule,
    ProductsModule,
    AccountsModule,
    KycModule,
    AuditModule,
    // DESPUES de AuditModule: el orden de registro define el orden de
    // anidamiento de los APP_INTERCEPTOR, y ObservabilityInterceptor
    // necesita que AuditInterceptor ya haya asignado request.correlationId.
    ObservabilityModule,
  ],
})
export class AppModule {}
