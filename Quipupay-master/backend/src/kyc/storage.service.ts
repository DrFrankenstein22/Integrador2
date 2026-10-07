import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';

const STORAGE_ROOT = join(process.cwd(), 'storage', 'kyc');

export type StoredMedia = {
  storedObjectId: string;
  objectKey: string;
  checksum: string;
  byteSize: number;
};

/**
 * Almacenamiento de la media cruda del KYC (fotos de DNI, snapshots, video).
 * - Local por defecto: `backend/storage/kyc/<sessionKey>/` (gitignored), cifrado
 *   AES-256-GCM con clave derivada de `KYC_STORAGE_KEY`.
 * - La media cruda se purga tras la decisión (`purgeSession`); solo quedan los
 *   scores derivados en la base y una fila `stored_objects` con el checksum.
 * - Sustituible por R2 (Cloudflare) implementando la misma interfaz.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('KYC_STORAGE_KEY') ?? 'dev-kyc-storage-key';
    this.key = scryptSync(secret, 'quipupay-kyc', 32);
  }

  async save(
    sessionKey: string,
    name: string,
    buffer: Buffer,
    mimeType: string,
    objectType: string,
  ): Promise<StoredMedia> {
    const dir = join(STORAGE_ROOT, sessionKey);
    await mkdir(dir, { recursive: true });

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, authTag, encrypted]);

    const objectKey = `${sessionKey}/${name}.enc`;
    await writeFile(join(dir, `${name}.enc`), payload);

    const checksum = createHash('sha256').update(buffer).digest('hex');

    // `objectKey` es determinístico (sessionKey + nombre de la toma), así que
    // reintentar una verificación (retomar fotos y volver a "Enviar y
    // continuar" en la misma sesión) reescribe el mismo archivo. Antes esto
    // hacía un `create()` y reventaba con "Unique constraint failed" en el
    // segundo intento — con `upsert` el reintento simplemente reemplaza la
    // fila anterior con el archivo nuevo.
    const stored = await this.prisma.storedObject.upsert({
      where: { bucket_objectKey: { bucket: 'local-kyc', objectKey } },
      create: {
        bucket: 'local-kyc',
        objectKey,
        objectType,
        mimeType,
        byteSize: BigInt(buffer.length),
        checksumSha256: checksum,
      },
      update: {
        objectType,
        mimeType,
        byteSize: BigInt(buffer.length),
        checksumSha256: checksum,
        statusCode: 'ACTIVE',
      },
    });

    return {
      storedObjectId: stored.id,
      objectKey,
      checksum,
      byteSize: buffer.length,
    };
  }

  async read(sessionKey: string, name: string): Promise<Buffer> {
    const payload = await readFile(join(STORAGE_ROOT, sessionKey, `${name}.enc`));
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const data = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /** Borra la media cruda de una sesión y marca los stored_objects como purgados. */
  async purgeSession(sessionKey: string): Promise<void> {
    try {
      await rm(join(STORAGE_ROOT, sessionKey), { recursive: true, force: true });
      await this.prisma.storedObject.updateMany({
        where: { bucket: 'local-kyc', objectKey: { startsWith: `${sessionKey}/` } },
        data: { statusCode: 'PURGED' },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo purgar la sesión KYC ${sessionKey}: ${
          error instanceof Error ? error.message : 'error'
        }`,
      );
    }
  }
}
