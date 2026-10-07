import { RiskEngineService, type RiskInputs } from '../src/kyc/risk-engine.service';
import { ObservabilityService } from '../src/observability/observability.service';
import type { PrismaService } from '../src/prisma/prisma.service';

const prisma = {
  riskRule: { findMany: jest.fn().mockResolvedValue([]) },
  riskEvent: { create: jest.fn().mockResolvedValue({}) },
} as unknown as PrismaService;

function inputs(over: Partial<RiskInputs> = {}): RiskInputs {
  return {
    identityMatch: 0.95,
    documentQuality: 0.9,
    documentAuthenticity: 0.9,
    activeChallenge: 1,
    passiveLiveness: 0.9,
    deepfakeScore: 0.95,
    faceMatch: 0.9,
    device: { isDevice: true, brand: 'Apple', modelName: 'iPhone', osName: 'iOS', osVersion: '18.0' },
    reasonCodes: [],
    ...over,
  };
}

describe('RiskEngineService', () => {
  const engine = new RiskEngineService(prisma, new ObservabilityService());

  it('todo en verde → APPROVED con riesgo bajo', async () => {
    const r = await engine.evaluate(inputs());
    expect(r.decision).toBe('APPROVED');
    expect(r.riskScore).toBeLessThanOrEqual(15);
    expect(r.trustScore + r.riskScore).toBeCloseTo(100, 1);
  });

  it('señales medias → REVIEW', async () => {
    const r = await engine.evaluate(
      inputs({ passiveLiveness: 0.55, documentQuality: 0.5, faceMatch: 0.6, deepfakeScore: 0.6 }),
    );
    expect(r.decision).toBe('REVIEW');
  });

  it('face match bajo → REJECTED forzado (hard-fail)', async () => {
    const r = await engine.evaluate(inputs({ faceMatch: 0.2 }));
    expect(r.decision).toBe('REJECTED');
    expect(r.reasonCodes).toContain('FACE_MATCH_LOW');
  });

  it('emulador → REJECTED con EMULATOR_DETECTED', async () => {
    const r = await engine.evaluate(inputs({ device: { isDevice: false } }));
    expect(r.decision).toBe('REJECTED');
    expect(r.reasonCodes).toContain('EMULATOR_DETECTED');
    expect(r.signals.deviceTrust).toBeLessThan(0.3);
  });

  it('challenge incompleto → REJECTED', async () => {
    const r = await engine.evaluate(inputs({ activeChallenge: 0.25 }));
    expect(r.decision).toBe('REJECTED');
    expect(r.reasonCodes).toContain('CHALLENGE_INCOMPLETE');
  });

  it('documento tipo pantalla → REJECTED', async () => {
    const r = await engine.evaluate(inputs({ documentAuthenticity: 0.2 }));
    expect(r.decision).toBe('REJECTED');
    expect(r.reasonCodes).toContain('DOC_SCREEN_CAPTURE');
  });
});
