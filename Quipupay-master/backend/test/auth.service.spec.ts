import * as bcrypt from 'bcrypt';

import { AuthService } from '../src/auth/auth.service';
import { ObservabilityService } from '../src/observability/observability.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { JwtService } from '@nestjs/jwt';
import type { KycService } from '../src/kyc/kyc.service';
import type { DevicesService } from '../src/devices/devices.service';
import type { IdentityService } from '../src/identity/identity.service';
import type { RegisterDto } from '../src/auth/dto/register.dto';
import type { LoginDto } from '../src/auth/dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

const PIN = '135790';

function baseRegisterDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    dni: '70813152',
    phone: '987654321',
    password: PIN,
    firstName: 'JESUS ALBERTO',
    lastName: 'GARCIA LOPEZ',
    ...overrides,
  } as RegisterDto;
}

function buildPrisma(overrides: { user?: Record<string, unknown> } = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      ...overrides.user,
    },
    pinCredential: { create: jest.fn() },
    userProfile: { create: jest.fn(), upsert: jest.fn() },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-user', code: 'USER' }) },
    userRole: { create: jest.fn() },
    loginAttempt: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  prisma.user.create.mockResolvedValue({
    id: 'user-1',
    dni: '70813152',
    phone: '987654321',
    email: null,
    statusCode: 'PENDING_VERIFICATION',
    createdAt: new Date('2026-09-02T10:00:00Z'),
  });

  return prisma as unknown as PrismaService & Record<string, any>;
}

function buildService(
  prisma: PrismaService,
  identityOverrides: Partial<IdentityService> = {},
) {
  const jwtService = { signAsync: jest.fn().mockResolvedValue('token-abc') } as unknown as JwtService;
  const kycService = { materialize: jest.fn() } as unknown as KycService;
  const devicesService = { recognize: jest.fn().mockResolvedValue({ deviceId: 'device-1', recognized: true }) } as unknown as DevicesService;
  const identityService = {
    findByDni: jest.fn().mockRejectedValue(new Error('identity unavailable')),
    ...identityOverrides,
  } as unknown as IdentityService;

  return new AuthService(
    prisma,
    jwtService,
    kycService,
    devicesService,
    identityService,
    new ObservabilityService(),
  );
}

describe('AuthService.register', () => {
  it('crea el perfil con el nombre validado por RENIEC y lo devuelve', async () => {
    const prisma = buildPrisma();
    const service = buildService(prisma);

    const result = await service.register(baseRegisterDto());

    expect((prisma as any).userProfile.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', firstName: 'JESUS ALBERTO', lastName: 'GARCIA LOPEZ' },
    });
    expect(result.user.firstName).toBe('JESUS ALBERTO');
  });
});

describe('AuthService.login', () => {
  it('devuelve el nombre guardado en el perfil del usuario', async () => {
    const pinHash = await bcrypt.hash(PIN, 4);
    const prisma = buildPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          dni: '70813152',
          phone: '987654321',
          email: null,
          statusCode: 'ACTIVE',
          pinCredential: { pinHash },
          profile: { firstName: 'JESUS ALBERTO', lastName: 'GARCIA LOPEZ' },
        }),
      },
    });
    const service = buildService(prisma);

    const result = await service.login({ dni: '70813152', password: PIN } as LoginDto);

    expect(result.user.firstName).toBe('JESUS ALBERTO');
  });

  it('recupera y guarda el nombre para una cuenta creada antes de tener perfil', async () => {
    const pinHash = await bcrypt.hash(PIN, 4);
    const prisma = buildPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          dni: '70813152',
          phone: '987654321',
          email: null,
          statusCode: 'ACTIVE',
          pinCredential: { pinHash },
          profile: null,
        }),
      },
    });
    (prisma as any).userProfile.upsert.mockResolvedValue({
      firstName: 'JESUS ALBERTO',
      lastName: 'GARCIA LOPEZ',
    });
    const service = buildService(prisma, {
      findByDni: jest.fn().mockResolvedValue({
        dni: '70813152',
        fullName: 'JESUS ALBERTO GARCIA LOPEZ',
        names: 'JESUS ALBERTO',
        paternalSurname: 'GARCIA',
        maternalSurname: 'LOPEZ',
        verificationCode: null,
        verified: true,
        source: 'APIS_NET_PE',
      }),
    } as Partial<IdentityService>);

    const result = await service.login({ dni: '70813152', password: PIN } as LoginDto);

    expect((prisma as any).userProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { firstName: 'JESUS ALBERTO', lastName: 'GARCIA LOPEZ' },
      create: { userId: 'user-1', firstName: 'JESUS ALBERTO', lastName: 'GARCIA LOPEZ' },
    });
    expect(result.user.firstName).toBe('JESUS ALBERTO');
  });

  it('mantiene firstName null si no se puede consultar el DNI de una cuenta vieja', async () => {
    const pinHash = await bcrypt.hash(PIN, 4);
    const prisma = buildPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          dni: '70813152',
          phone: '987654321',
          email: null,
          statusCode: 'ACTIVE',
          pinCredential: { pinHash },
          profile: null,
        }),
      },
    });
    const service = buildService(prisma);

    const result = await service.login({ dni: '70813152', password: PIN } as LoginDto);

    expect(result.user.firstName).toBeNull();
  });

  it('rechaza una clave incorrecta', async () => {
    const pinHash = await bcrypt.hash(PIN, 4);
    const prisma = buildPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          dni: '70813152',
          phone: '987654321',
          email: null,
          statusCode: 'ACTIVE',
          pinCredential: { pinHash },
          profile: null,
        }),
      },
    });
    const service = buildService(prisma);

    await expect(
      service.login({ dni: '70813152', password: '000000' } as LoginDto),
    ).rejects.toThrow(UnauthorizedException);
  });
});
