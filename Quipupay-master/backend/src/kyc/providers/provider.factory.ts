import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { KycProviderSet } from './types';
import { MockDeepfakeProvider } from './mock/mock-deepfake.provider';
import { MockDocumentProvider } from './mock/mock-document.provider';
import { MockDocumentExpiryProvider } from './mock/mock-document-expiry.provider';
import { MockFaceProvider } from './mock/mock-face.provider';
import { MockLivenessProvider } from './mock/mock-liveness.provider';

const logger = new Logger('KycProviderFactory');

/**
 * Devuelve el conjunto de proveedores de IA según `KYC_PROVIDER`.
 * - `mock` (default): heurísticas locales, sin costo.
 * - `aws`: AWS Rekognition (requiere @aws-sdk/client-rekognition y credenciales);
 *   se carga de forma perezosa para no pesar cuando no se usa.
 */
export function createKycProviders(config: ConfigService): KycProviderSet {
  const provider = (config.get<string>('KYC_PROVIDER') ?? 'mock').toLowerCase();

  if (provider === 'aws') {
    try {
      // Import perezoso: solo si de verdad se pide AWS.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const aws = require('./aws') as typeof import('./aws');
      logger.log('Proveedores KYC: AWS Rekognition');
      return aws.createAwsProviders(config);
    } catch (error) {
      logger.warn(
        `KYC_PROVIDER=aws pero no se pudo cargar el conector AWS (${
          error instanceof Error ? error.message : 'error'
        }). Usando mock.`,
      );
    }
  }

  logger.log('Proveedores KYC: mock (heurísticas locales)');
  return {
    face: new MockFaceProvider(),
    liveness: new MockLivenessProvider(),
    document: new MockDocumentProvider(),
    deepfake: new MockDeepfakeProvider(),
    documentExpiry: new MockDocumentExpiryProvider(),
  };
}
