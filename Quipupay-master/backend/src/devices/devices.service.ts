import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { DeviceInfoDto } from '../auth/dto/device-info.dto';

export type DeviceRecognition = {
  deviceId: string;
  /** true = este teléfono ya había iniciado sesión antes con esta cuenta. */
  recognized: boolean;
};

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * No guardamos el identificador del dispositivo tal cual lo manda el
   * teléfono — se guarda su hash, igual que una contraseña. El nombre de la
   * columna (`device_fingerprint_hash`) ya lo deja claro.
   */
  private fingerprint(deviceId: string): string {
    return createHash('sha256').update(deviceId).digest('hex');
  }

  /**
   * Registra o actualiza el dispositivo ligado a un usuario y dice si ya
   * existía (mismo teléfono, misma cuenta, alguna vez antes) o si es la
   * primera vez que se ve. Nunca debe tumbar un login/registro: si algo
   * falla acá, quien llama simplemente no sabrá si el dispositivo es
   * reconocido, pero la sesión sigue.
   */
  async recognize(userId: string, info: DeviceInfoDto): Promise<DeviceRecognition> {
    const deviceFingerprintHash = this.fingerprint(info.deviceId);

    const existing = await this.prisma.device.findUnique({
      where: { userId_deviceFingerprintHash: { userId, deviceFingerprintHash } },
    });

    if (existing) {
      await this.prisma.device.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          osVersion: info.osVersion ?? existing.osVersion,
          appVersion: info.appVersion ?? existing.appVersion,
        },
      });
      return { deviceId: existing.id, recognized: true };
    }

    const created = await this.prisma.device.create({
      data: {
        userId,
        deviceFingerprintHash,
        platform: info.platform,
        osVersion: info.osVersion,
        appVersion: info.appVersion,
        lastSeenAt: new Date(),
      },
    });
    return { deviceId: created.id, recognized: false };
  }
}
