import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IdentityModule } from '../identity/identity.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { ChallengeService } from './challenge.service';
import { StorageService } from './storage.service';
import { RiskEngineService } from './risk-engine.service';
import { createKycProviders } from './providers/provider.factory';
import { KYC_PROVIDERS } from './providers/types';

@Module({
  imports: [IdentityModule],
  controllers: [KycController],
  providers: [
    KycService,
    ChallengeService,
    StorageService,
    RiskEngineService,
    {
      provide: KYC_PROVIDERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createKycProviders(config),
    },
  ],
  exports: [KycService],
})
export class KycModule {}
