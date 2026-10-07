import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ChallengeService } from '../src/kyc/challenge.service';
import type { PrismaService } from '../src/prisma/prisma.service';

function buildPrisma(stored: Record<string, unknown> | null) {
  const created = {
    id: 'ch-1',
    sessionKey: 'sess-abc',
    nonce: 'nonce-1',
    script: [{ code: 'LOOK_UP', label: 'x', seconds: 3 }],
    consumedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
  return {
    livenessChallenge: {
      create: jest.fn().mockResolvedValue(created),
      findUnique: jest.fn().mockResolvedValue(stored),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('ChallengeService', () => {
  it('issue: genera 4 pasos distintos y un nonce', async () => {
    const service = new ChallengeService(buildPrisma(null));
    const result = await service.issue('sess-abc');

    expect(result.steps).toHaveLength(4);
    expect(new Set(result.steps.map((s) => s.code)).size).toBe(4);
    expect(result.nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it('issue: dos challenges no son siempre iguales', async () => {
    const service = new ChallengeService(buildPrisma(null));
    const a = (await service.issue('s')).steps.map((s) => s.code).join();
    const b = (await service.issue('s')).steps.map((s) => s.code).join();
    const c = (await service.issue('s')).steps.map((s) => s.code).join();
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it('consume: rechaza un challenge de otra sesión', async () => {
    const prisma = buildPrisma({
      id: 'ch-1',
      sessionKey: 'otra',
      nonce: 'n',
      script: [],
      consumedAt: null,
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(
      new ChallengeService(prisma).consume('ch-1', 'sess-abc', 'n'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('consume: rechaza un nonce que no coincide', async () => {
    const prisma = buildPrisma({
      id: 'ch-1',
      sessionKey: 'sess-abc',
      nonce: 'correcto',
      script: [],
      consumedAt: null,
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(
      new ChallengeService(prisma).consume('ch-1', 'sess-abc', 'malo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consume: rechaza un challenge ya usado o expirado', async () => {
    const used = new ChallengeService(
      buildPrisma({
        id: 'ch-1',
        sessionKey: 'sess-abc',
        nonce: 'n',
        script: [],
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      }),
    );
    await expect(used.consume('ch-1', 'sess-abc', 'n')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const expired = new ChallengeService(
      buildPrisma({
        id: 'ch-1',
        sessionKey: 'sess-abc',
        nonce: 'n',
        script: [],
        consumedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      }),
    );
    await expect(expired.consume('ch-1', 'sess-abc', 'n')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('consume: devuelve el guion y marca consumido', async () => {
    const prisma = buildPrisma({
      id: 'ch-1',
      sessionKey: 'sess-abc',
      nonce: 'n',
      script: [{ code: 'SMILE', label: 'Sonríe', seconds: 3 }],
      consumedAt: null,
      expiresAt: new Date(Date.now() + 1000),
    });
    const steps = await new ChallengeService(prisma).consume('ch-1', 'sess-abc', 'n');
    expect(steps[0].code).toBe('SMILE');
    expect((prisma as any).livenessChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );
  });
});
