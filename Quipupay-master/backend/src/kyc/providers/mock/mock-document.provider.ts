import { documentHeuristics } from '../../analysis/document-heuristics';
import { imageStats } from '../../analysis/image-stats';
import type { DocumentAnalysis, DocumentInput, DocumentProvider } from '../types';

/**
 * Análisis de documento por heurísticas de imagen (sin OCR neuronal ni PAD de
 * documento). El OCR real / verificación cruzada RENIEC lo aporta el KycService
 * a través de apis.net.pe; este proveedor solo puntúa calidad y autenticidad.
 * Sustituible por un proveedor con OCR Transformer + verificación de hologramas.
 */
export class MockDocumentProvider implements DocumentProvider {
  readonly name = 'mock-document@1';

  async analyze(input: DocumentInput): Promise<DocumentAnalysis> {
    const [frontStats, frontTiltStats, backStats] = await Promise.all([
      imageStats(input.frontStraight),
      imageStats(input.frontTilt),
      imageStats(input.backStraight),
    ]);

    const front = await documentHeuristics(
      input.frontStraight,
      input.frontTilt,
      frontStats,
      frontTiltStats,
    );
    const back = await documentHeuristics(
      input.backStraight,
      input.backTilt,
      backStats,
      await imageStats(input.backTilt),
    );

    const quality = Number(Math.min(front.quality, back.quality).toFixed(3));
    const authenticity = Number(
      ((front.authenticity * 0.65 + back.authenticity * 0.35)).toFixed(3),
    );
    const reasonCodes = Array.from(new Set([...front.reasonCodes, ...back.reasonCodes]));

    return {
      ocr: { fullName: null, documentNumber: null, confidence: 0 },
      quality,
      authenticity,
      reasonCodes,
    };
  }
}
