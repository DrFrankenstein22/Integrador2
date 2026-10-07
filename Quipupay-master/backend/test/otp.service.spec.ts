import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { OtpService } from '../src/identity/otp.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { EmailService } from '../src/identity/email.service';
import type { SmsService } from '../src/identity/sms.service';

function buildPrisma(challenge: Record<string, unknown> | null) {
  return {
    otpChallenge: {
      create: jest.fn().mockResolvedValue({ id: 'ch-1' }),
      findUnique: jest.fn().mockResolvedValue(challenge),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

function buildEmailService() {
  return { sendVerificationCode: jest.fn().mockResolvedValue(undefined) } as unknown as EmailService;
}

function buildSmsService() {
  return { sendVerificationCode: jest.fn().mockResolvedValue(undefined) } as unknown as SmsService;
}

const devConfig = { get: () => undefined } as unknown as ConfigService;
const smsConfiguredConfig = {
  get: (key: string) => (key === 'SMS_PROVIDER' ? 'telnyx' : undefined),
} as unknown as ConfigService;

function buildService(
  prisma: PrismaService,
  config: ConfigService = devConfig,
  email: EmailService = buildEmailService(),
  sms: SmsService = buildSmsService(),
) {
  return new OtpService(prisma, config, email, sms);
}

describe('OtpService.request', () => {
  it('returns the dev code when no SMS provider is configured (demo mode)', async () => {
    const sms = buildSmsService();
    const service = buildService(buildPrisma(null), devConfig, buildEmailService(), sms);
    const result = await service.request('987654321');
    expect(result.challengeId).toBe('ch-1');
    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(sms.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('sends the real SMS and never returns the code once Telnyx is configured', async () => {
    const sms = buildSmsService();
    const service = buildService(buildPrisma(null), smsConfiguredConfig, buildEmailService(), sms);
    const result = await service.request('987654321');
    expect(result).not.toHaveProperty('devCode');
    expect(sms.sendVerificationCode).toHaveBeenCalledWith('987654321', expect.stringMatching(/^\d{6}$/));
  });
});

describe('OtpService.requestEmail', () => {
  it('sends the real code by email (no demo mode for this channel)', async () => {
    const email = buildEmailService();
    const service = buildService(buildPrisma(null), devConfig, email);
    const result = await service.requestEmail('persona@correo.com');

    expect(result.challengeId).toBe('ch-1');
    expect(result).not.toHaveProperty('devCode');
    expect(email.sendVerificationCode).toHaveBeenCalledWith(
      'persona@correo.com',
      expect.stringMatching(/^\d{6}$/),
    );
  });
});

describe('OtpService.verify', () => {
  async function challenge(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ch-1',
      purpose: 'PHONE_VERIFICATION',
      otpHash: await bcrypt.hash('123456', 4),
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      destination: '987654321',
      ...overrides,
    };
  }

  it('accepts the right code and consumes the challenge', async () => {
    const prisma = buildPrisma(await challenge());
    const result = await buildService(prisma).verify('ch-1', '123456');
    expect(result.verified).toBe(true);
    expect((prisma as any).otpChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
    );
  });

  it('rejects a wrong code and increments attempts', async () => {
    const prisma = buildPrisma(await challenge());
    await expect(buildService(prisma).verify('ch-1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect((prisma as any).otpChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
  });

  it('rejects an expired challenge', async () => {
    const prisma = buildPrisma(await challenge({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(buildService(prisma).verify('ch-1', '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an already consumed challenge', async () => {
    const prisma = buildPrisma(await challenge({ consumedAt: new Date() }));
    await expect(buildService(prisma).verify('ch-1', '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('OtpService.verifyEmail', () => {
  async function emailChallenge(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ch-1',
      purpose: 'EMAIL_VERIFICATION',
      otpHash: await bcrypt.hash('123456', 4),
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      destination: 'persona@correo.com',
      ...overrides,
    };
  }

  it('accepts the right code and returns the email', async () => {
    const prisma = buildPrisma(await emailChallenge());
    const result = await buildService(prisma).verifyEmail('ch-1', '123456');
    expect(result).toEqual({ verified: true, email: 'persona@correo.com' });
  });

  it('does not accept a phone challenge as an email challenge', async () => {
    const prisma = buildPrisma({
      id: 'ch-1',
      purpose: 'PHONE_VERIFICATION',
      destination: '987654321',
    });
    await expect(buildService(prisma).verifyEmail('ch-1', '123456')).rejects.toThrow(
      'El código solicitado no existe',
    );
  });
});
