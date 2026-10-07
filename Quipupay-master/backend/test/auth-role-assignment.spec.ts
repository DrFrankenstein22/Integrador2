import { InternalServerErrorException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

import { AuthService } from '../src/auth/auth.service';
import { ObservabilityService } from '../src/observability/observability.service';
import type { DevicesService } from '../src/devices/devices.service';
import type { IdentityService } from '../src/identity/identity.service';
import type { KycService } from '../src/kyc/kyc.service';
import type { PrismaService } from '../src/prisma/prisma.service';

const REGISTER_DTO = {
  dni: '12345678',
  phone: '999888777',
  password: '135790',
  firstName: 'ADA',
  lastName: 'LOVELACE',
};

function registrationHarness(role: { id: string; code: string } | null) {
  const createdUser = {
    id: 'user-1',
    dni: REGISTER_DTO.dni,
    phone: REGISTER_DTO.phone,
    email: null,
    statusCode: 'PENDING_VERIFICATION',
    createdAt: new Date('2026-09-09T10:00:00.000Z'),
  };
  const tx = {
    user: { create: jest.fn().mockResolvedValue(createdUser) },
    pinCredential: { create: jest.fn().mockResolvedValue({ id: 'pin-1' }) },
    userProfile: { create: jest.fn().mockResolvedValue({ id: 'profile-1' }) },
    role: { findUnique: jest.fn().mockResolvedValue(role) },
    userRole: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    ),
  } as unknown as PrismaService;
  const service = new AuthService(
    prisma,
    {} as JwtService,
    {} as KycService,
    {} as DevicesService,
    {} as IdentityService,
    new ObservabilityService(),
  );

  return { service, tx };
}

describe('AuthService registration role assignment', () => {
  it('assigns the seeded USER role in the registration transaction', async () => {
    const { service, tx } = registrationHarness({
      id: 'role-user',
      code: 'USER',
    });

    await expect(service.register(REGISTER_DTO)).resolves.toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ id: 'user-1' }),
      }),
    );

    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { code: 'USER' },
    });
    expect(tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', roleId: 'role-user' },
    });
    expect(tx.role.findUnique.mock.invocationCallOrder[0]).toBeLessThan(
      tx.userRole.create.mock.invocationCallOrder[0],
    );
  });

  it('does not create an unclassified user when the USER role is missing', async () => {
    const { service, tx } = registrationHarness(null);

    await expect(service.register(REGISTER_DTO)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(tx.userRole.create).not.toHaveBeenCalled();
  });
});
