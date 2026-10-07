import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { KycService } from '../kyc/kyc.service';
import { DevicesService } from '../devices/devices.service';
import { IdentityService } from '../identity/identity.service';
import { ObservabilityService } from '../observability/observability.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { DeviceInfoDto } from './dto/device-info.dto';

const PIN_HASH_ALGORITHM = 'bcrypt';
const LOGIN_CHANNEL = 'MOBILE_PIN';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly kyc: KycService,
    private readonly devices: DevicesService,
    private readonly identity: IdentityService,
    private readonly obs: ObservabilityService,
  ) {}

  /** Nunca debe tumbar un login/registro por un problema al registrar el dispositivo. */
  private async recognizeDevice(userId: string, device?: DeviceInfoDto) {
    if (!device) {
      return { deviceId: undefined, recognized: undefined };
    }
    try {
      return await this.devices.recognize(userId, device);
    } catch {
      return { deviceId: undefined, recognized: undefined };
    }
  }

  private async backfillProfileFromDni(userId: string, dni: string) {
    try {
      const identity = await this.identity.findByDni(dni);
      const firstName = identity.names?.trim();
      const lastName = [
        identity.paternalSurname?.trim(),
        identity.maternalSurname?.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      if (!firstName || !lastName) {
        return null;
      }

      return await this.prisma.userProfile.upsert({
        where: { userId },
        update: { firstName, lastName },
        create: { userId, firstName, lastName },
      });
    } catch {
      return null;
    }
  }

  async register(dto: RegisterDto) {
    const existingByDni = await this.prisma.user.findUnique({
      where: {
        dni: dto.dni,
      },
    });

    if (existingByDni) {
      throw new ConflictException('El DNI ya se encuentra registrado');
    }

    const existingByPhone = await this.prisma.user.findUnique({
      where: {
        phone: dto.phone,
      },
    });

    if (existingByPhone) {
      throw new ConflictException(
        'El número de teléfono ya se encuentra registrado',
      );
    }

    if (dto.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existingByEmail) {
        throw new ConflictException(
          'El correo electrónico ya se encuentra registrado',
        );
      }
    }

    const pinHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const createdUser = await tx.user.create({
          data: {
            dni: dto.dni,
            phone: dto.phone,
            email: dto.email,
          },
        });

        await tx.pinCredential.create({
          data: {
            userId: createdUser.id,
            pinHash,
            hashAlgorithm: PIN_HASH_ALGORITHM,
          },
        });

        await tx.userProfile.create({
          data: {
            userId: createdUser.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });

        const userRole = await tx.role.findUnique({
          where: { code: 'USER' },
        });

        if (!userRole) {
          throw new InternalServerErrorException(
            'El rol USER no está configurado',
          );
        }

        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: userRole.id,
          },
        });

        return createdUser;
      },
    );

    if (dto.kycSessionKey) {
      await this.kyc.materialize(user.id, dto.kycSessionKey);
    }

    return {
      message: 'Usuario registrado correctamente',
      user: {
        id: user.id,
        dni: user.dni,
        phone: user.phone,
        email: user.email,
        status: user.statusCode,
        firstName: dto.firstName,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const startedAt = Date.now();
    const user = await this.obs.startSegment(
      'Datastore/statement/Postgres/user/findUnique',
      true,
      () =>
        this.prisma.user.findUnique({
          where: {
            dni: dto.dni,
          },
          include: {
            pinCredential: true,
            profile: true,
          },
        }),
    );

    if (!user || !user.pinCredential) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPinValid = await bcrypt.compare(
      dto.password,
      user.pinCredential.pinHash,
    );

    if (!isPinValid) {
      const { deviceId } = await this.recognizeDevice(user.id, dto.device);
      await this.recordLoginAttempt(user.id, 'FAILURE', 'INVALID_PIN', deviceId);
      this.recordLoginMetric('FAILURE', 'INVALID_PIN', user.id, false, startedAt);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.statusCode === 'BLOCKED' || user.statusCode === 'CLOSED') {
      const { deviceId } = await this.recognizeDevice(user.id, dto.device);
      await this.recordLoginAttempt(user.id, 'FAILURE', 'ACCOUNT_NOT_ACTIVE', deviceId);
      this.recordLoginMetric('FAILURE', 'ACCOUNT_NOT_ACTIVE', user.id, false, startedAt);
      throw new UnauthorizedException(
        'La cuenta no está habilitada para iniciar sesión',
      );
    }

    const payload = {
      sub: user.id,
      dni: user.dni,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const { deviceId, recognized } = await this.recognizeDevice(user.id, dto.device);
    await this.recordLoginAttempt(user.id, 'SUCCESS', undefined, deviceId);
    this.recordLoginMetric('SUCCESS', undefined, user.id, recognized ?? false, startedAt);

    const profile =
      user.profile ?? (await this.backfillProfileFromDni(user.id, user.dni));

    return {
      message: 'Inicio de sesión correcto',
      accessToken,
      deviceRecognized: recognized,
      user: {
        id: user.id,
        dni: user.dni,
        phone: user.phone,
        email: user.email,
        status: user.statusCode,
        firstName: profile?.firstName ?? null,
      },
    };
  }

  private async recordLoginAttempt(
    userId: string,
    result: 'SUCCESS' | 'FAILURE',
    failureReason?: string,
    deviceId?: string,
  ) {
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        deviceId,
        channel: LOGIN_CHANNEL,
        result,
        failureReason,
      },
    });
  }

  /**
   * Espeja recordLoginAttempt (que ya persiste en BD) hacia New Relic. Solo
   * el UUID del usuario viaja como atributo — nunca el DNI, el PIN ni el
   * accessToken.
   */
  private recordLoginMetric(
    result: 'SUCCESS' | 'FAILURE',
    failureReason: string | undefined,
    userId: string,
    deviceRecognized: boolean,
    startedAt: number,
  ) {
    this.obs.incrementMetric(`Custom/Auth/Login/${result === 'SUCCESS' ? 'Success' : 'Failure'}`);
    this.obs.recordEvent('QuipupayLoginAttempt', {
      result,
      failureReason,
      userId,
      deviceRecognized,
      durationMs: Date.now() - startedAt,
    });
    this.obs.addAttributes({ actorUserId: userId, loginResult: result });
  }
}
