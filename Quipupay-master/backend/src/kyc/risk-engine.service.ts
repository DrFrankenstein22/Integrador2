import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import type { Decision } from './providers/types';

export const RISK_MODEL_VERSION = 'quipupay-risk@1';

export type DeviceSignals = {
  isDevice: boolean;
  brand?: string | null;
  modelName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  deviceType?: string | null;
};

export type RiskInputs = {
  identityMatch: number;
  documentQuality: number;
  documentAuthenticity: number;
  activeChallenge: number;
  passiveLiveness: number;
  deepfakeScore: number;
  faceMatch: number;
  device: DeviceSignals;
  reasonCodes: string[];
};

export type RiskSignals = {
  identityMatch: number;
  documentQuality: number;
  documentAuthenticity: number;
  activeChallenge: number;
  passiveLiveness: number;
  deepfakeScore: number;
  faceMatch: number;
  deviceTrust: number;
};

export type RiskOutcome = {
  decision: Decision;
  riskScore: number;
  trustScore: number;
  signals: RiskSignals;
  reasonCodes: string[];
  modelVersion: string;
};

const WEIGHTS: Record<keyof RiskSignals, number> = {
  identityMatch: 0.15,
  documentQuality: 0.1,
  documentAuthenticity: 0.15,
  activeChallenge: 0.15,
  passiveLiveness: 0.15,
  deepfakeScore: 0.1,
  faceMatch: 0.15,
  deviceTrust: 0.05,
};

// Umbral bajo el cual la señal fuerza RECHAZO y su reason code.
const HARD_FAILS: Partial<Record<keyof RiskSignals, { threshold: number; code: string }>> = {
  faceMatch: { threshold: 0.4, code: 'FACE_MATCH_LOW' },
  activeChallenge: { threshold: 0.5, code: 'CHALLENGE_INCOMPLETE' },
  documentAuthenticity: { threshold: 0.35, code: 'DOC_SCREEN_CAPTURE' },
  deepfakeScore: { threshold: 0.3, code: 'DEEPFAKE_SUSPECTED' },
  deviceTrust: { threshold: 0.3, code: 'EMULATOR_DETECTED' },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function deviceTrustScore(d: DeviceSignals): number {
  if (!d.isDevice) {
    return 0.1; // emulador
  }
  let score = 0.9;
  if (!d.osVersion) {
    score -= 0.1;
  }
  if (!d.brand && !d.modelName) {
    score -= 0.1;
  }
  return clamp01(score);
}

@Injectable()
export class RiskEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: ObservabilityService,
  ) {}

  async evaluate(inputs: RiskInputs): Promise<RiskOutcome> {
    const signals: RiskSignals = {
      identityMatch: clamp01(inputs.identityMatch),
      documentQuality: clamp01(inputs.documentQuality),
      documentAuthenticity: clamp01(inputs.documentAuthenticity),
      activeChallenge: clamp01(inputs.activeChallenge),
      passiveLiveness: clamp01(inputs.passiveLiveness),
      deepfakeScore: clamp01(inputs.deepfakeScore),
      faceMatch: clamp01(inputs.faceMatch),
      deviceTrust: deviceTrustScore(inputs.device),
    };

    const trustScore = Number(
      (
        (Object.keys(signals) as (keyof RiskSignals)[]).reduce(
          (sum, key) => sum + signals[key] * WEIGHTS[key],
          0,
        ) * 100
      ).toFixed(1),
    );
    const riskScore = Number((100 - trustScore).toFixed(1));

    const reasonCodes = new Set(inputs.reasonCodes);
    let decision: Decision =
      riskScore <= 15 ? 'APPROVED' : riskScore <= 40 ? 'REVIEW' : 'REJECTED';

    for (const [key, rule] of Object.entries(HARD_FAILS) as [
      keyof RiskSignals,
      { threshold: number; code: string },
    ][]) {
      if (signals[key] < rule.threshold) {
        decision = 'REJECTED';
        reasonCodes.add(rule.code);
      }
    }

    const outcome: RiskOutcome = {
      decision,
      riskScore,
      trustScore,
      signals,
      reasonCodes: [...reasonCodes],
      modelVersion: RISK_MODEL_VERSION,
    };

    // Los signals son scores derivados (floats 0..1), no biometria ni
    // buffers — se pueden enviar. sessionKey, frames y video jamas.
    this.obs.incrementMetric(`Custom/Kyc/Decision/${outcome.decision}`);
    this.obs.recordMetric('Custom/Kyc/RiskScore', outcome.riskScore);
    this.obs.recordMetric('Custom/Kyc/TrustScore', outcome.trustScore);
    this.obs.recordEvent('QuipupayKycDecision', {
      decision: outcome.decision,
      riskScore: outcome.riskScore,
      trustScore: outcome.trustScore,
      modelVersion: outcome.modelVersion,
      reasonCodes: outcome.reasonCodes.join(','),
      faceMatch: outcome.signals.faceMatch,
      passiveLiveness: outcome.signals.passiveLiveness,
      deepfakeScore: outcome.signals.deepfakeScore,
      provider: process.env.KYC_PROVIDER ?? 'mock',
    });

    await this.persistRiskEvents(outcome);
    return outcome;
  }

  private async persistRiskEvents(outcome: RiskOutcome): Promise<void> {
    if (outcome.reasonCodes.length === 0) {
      return;
    }
    const rules = await this.prisma.riskRule.findMany({
      where: { code: { in: outcome.reasonCodes } },
    });
    const byCode = new Map(rules.map((r) => [r.code, r]));

    await Promise.all(
      outcome.reasonCodes.map((code) =>
        this.prisma.riskEvent.create({
          data: {
            ruleId: byCode.get(code)?.id ?? null,
            eventType: 'KYC_SIGNAL',
            severity: byCode.get(code)?.severity ?? 'LOW',
            decision: outcome.decision,
            metadata: { code, riskScore: outcome.riskScore },
          },
        }),
      ),
    );
  }
}
