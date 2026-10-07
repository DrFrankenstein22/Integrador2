import type { DocumentExpiry, DocumentExpiryProvider } from '../types';

/**
 * Sin OCR real no hay forma de leer la fecha ni el nombre impresos en el
 * documento — el mock siempre devuelve "no se pudo determinar" en ambos (no
 * bloquea el flujo). Sustituible por un proveedor real
 * (AwsDocumentExpiryProvider) vía KYC_PROVIDER=aws.
 */
export class MockDocumentExpiryProvider implements DocumentExpiryProvider {
  readonly name = 'mock-document-expiry@1';

  async check(): Promise<DocumentExpiry> {
    return { expiryDate: null, expired: null, nameMatch: null, nameMatchScore: 0 };
  }
}
