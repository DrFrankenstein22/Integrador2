import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ObservabilityService } from './observability.service';
import { ObservabilityInterceptor } from './observability.interceptor';
import { ApmDemoController } from './demo/apm-demo.controller';
import { DemoEnabledGuard } from './demo/demo-enabled.guard';

// Decision en tiempo de construccion del modulo (antes de que la DI exista),
// por eso se lee process.env directo y no ConfigService: en produccion el
// controller de demo ni siquiera se monta ni aparece en Swagger. El
// DemoEnabledGuard es el segundo candado, en runtime.
const demoEnabled =
  process.env.NODE_ENV !== 'production' && process.env.APM_DEMO_ENABLED !== 'false';

@Global()
@Module({
  controllers: demoEnabled ? [ApmDemoController] : [],
  providers: [
    ObservabilityService,
    DemoEnabledGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
