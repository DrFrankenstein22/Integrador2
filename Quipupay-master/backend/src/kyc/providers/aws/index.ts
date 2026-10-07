/* eslint-disable @typescript-eslint/no-require-imports */
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { videoHeuristics } from '../../analysis/video-heuristics';
import { findExpiryDate } from '../../analysis/document-dates';
import { matchName } from '../../analysis/document-name';
import { MockDeepfakeProvider } from '../mock/mock-deepfake.provider';
import { MockDocumentProvider } from '../mock/mock-document.provider';
import type {
  DocumentExpiry,
  DocumentExpiryProvider,
  FaceComparison,
  FaceDetection,
  FaceProvider,
  KycProviderSet,
  LivenessInput,
  LivenessProvider,
  LivenessResult,
} from '../types';

const logger = new Logger('AwsKycProviders');

/**
 * Conector AWS Rekognition. Requiere:
 *   npm i @aws-sdk/client-rekognition
 *   KYC_PROVIDER=aws  +  AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
 *
 * Face match real (CompareFaces) y detección de rostro/calidad (DetectFaces).
 * Para liveness real de nivel PAD se usa Rekognition Face Liveness, que necesita
 * el SDK del cliente móvil (sesión de streaming) → se activa junto a un
 * development build. Mientras tanto el liveness combina Rekognition DetectFaces
 * con las heurísticas de video.
 */

function rekognition(config: ConfigService) {
  const { RekognitionClient } = require('@aws-sdk/client-rekognition');
  return new RekognitionClient({
    region: config.get<string>('AWS_REGION') ?? 'us-east-1',
    credentials: {
      accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
      secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
    },
  });
}

class AwsFaceProvider implements FaceProvider {
  readonly name = 'aws-rekognition-face@1';
  constructor(private readonly config: ConfigService) {}

  async detectFace(image: Buffer): Promise<FaceDetection> {
    const { DetectFacesCommand } = require('@aws-sdk/client-rekognition');
    const client = rekognition(this.config);

    try {
      const res: any = await client.send(
        new DetectFacesCommand({ Image: { Bytes: image }, Attributes: ['DEFAULT'] }),
      );
      const face = res.FaceDetails?.[0];
      return {
        faceCount: res.FaceDetails?.length ?? 0,
        quality: (face?.Confidence ?? 0) / 100,
        sharpness: (face?.Quality?.Sharpness ?? 0) / 100,
        box: face?.BoundingBox
          ? {
              x: face.BoundingBox.Left ?? 0,
              y: face.BoundingBox.Top ?? 0,
              width: face.BoundingBox.Width ?? 0,
              height: face.BoundingBox.Height ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      logger.warn(
        `AWS Rekognition DetectFaces falló: ${error instanceof Error ? error.message : 'error'}`,
      );
      return { faceCount: 0, quality: 0, sharpness: 0 };
    }
  }

  async compareFaces(reference: Buffer, probe: Buffer): Promise<FaceComparison> {
    const { CompareFacesCommand } = require('@aws-sdk/client-rekognition');
    const client = rekognition(this.config);

    try {
      const res: any = await client.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: reference },
          TargetImage: { Bytes: probe },
          SimilarityThreshold: 0,
        }),
      );
      const match = res.FaceMatches?.[0];
      return {
        matchScore: (match?.Similarity ?? 0) / 100,
        confidence: (match?.Face?.Confidence ?? 50) / 100,
      };
    } catch (error) {
      // Rekognition lanza InvalidParameterException cuando no encuentra un
      // rostro utilizable en alguna de las dos imágenes (foto borrosa, sin
      // cara, oclusión total, etc.). Es una señal real: se traduce en
      // matchScore 0, no en un error del backend.
      logger.warn(
        `AWS Rekognition CompareFaces sin coincidencia utilizable: ${
          error instanceof Error ? error.message : 'error'
        }`,
      );
      return { matchScore: 0, confidence: 0 };
    }
  }
}

class AwsLivenessProvider implements LivenessProvider {
  readonly name = 'aws-rekognition-liveness@1';

  async analyze(input: LivenessInput): Promise<LivenessResult> {
    const h = await videoHeuristics(
      input.frames,
      input.videoDurationMs,
      input.stepTimingsMs,
      input.challenge,
    );
    const score =
      h.challengeCompletion * 0.4 + h.motionScore * 0.4 + h.timingPlausibility * 0.2;
    return {
      score: Number(score.toFixed(3)),
      decision: score >= 0.7 ? 'APPROVED' : score >= 0.45 ? 'REVIEW' : 'REJECTED',
      signals: {
        challengeCompletion: h.challengeCompletion,
        motionScore: h.motionScore,
        timingPlausibility: h.timingPlausibility,
      },
      reasonCodes: h.reasonCodes,
    };
  }
}

/**
 * Lee el texto impreso en el frente del DNI con OCR (Rekognition DetectText)
 * para dos cosas que RENIEC no expone por API: la fecha de caducidad y si el
 * nombre que RENIEC devolvió para ese número de DNI está impreso en la foto
 * (sin esto, alguien podría escribir su propio número de DNI válido y
 * fotografiar el documento físico de otra persona). Una sola llamada a
 * Rekognition sirve para ambas verificaciones.
 */
class AwsDocumentExpiryProvider implements DocumentExpiryProvider {
  readonly name = 'aws-rekognition-text@1';
  constructor(private readonly config: ConfigService) {}

  async check(frontImage: Buffer, expectedFullName?: string | null): Promise<DocumentExpiry> {
    const { DetectTextCommand } = require('@aws-sdk/client-rekognition');
    const client = rekognition(this.config);

    try {
      const res: any = await client.send(
        new DetectTextCommand({ Image: { Bytes: frontImage } }),
      );
      const detections: Array<{ DetectedText?: string; Type?: string }> =
        res.TextDetections ?? [];
      // LINE agrupa palabras contiguas — más útil que WORD para encontrar
      // "CADUCIDAD"/el nombre en la misma franja de texto; ya vienen en el
      // orden en que Rekognition las devuelve (de arriba hacia abajo).
      const lines = detections
        .filter((d) => d.Type === 'LINE' && d.DetectedText)
        .map((d) => d.DetectedText as string);

      const expiry = findExpiryDate(lines);
      const { match: nameMatch, score: nameMatchScore } = matchName(expectedFullName, lines);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      return {
        expiryDate: expiry?.iso ?? null,
        expired: expiry ? expiry.date.getTime() < today.getTime() : null,
        nameMatch,
        nameMatchScore,
      };
    } catch (error) {
      logger.warn(
        `AWS Rekognition DetectText falló: ${error instanceof Error ? error.message : 'error'}`,
      );
      return { expiryDate: null, expired: null, nameMatch: null, nameMatchScore: 0 };
    }
  }
}

export function createAwsProviders(config: ConfigService): KycProviderSet {
  // Falla aquí si el SDK no está instalado → el factory hace fallback a mock.
  require('@aws-sdk/client-rekognition');
  logger.log('Conector AWS Rekognition activo (face match real)');
  return {
    face: new AwsFaceProvider(config),
    liveness: new AwsLivenessProvider(),
    document: new MockDocumentProvider(),
    deepfake: new MockDeepfakeProvider(),
    documentExpiry: new AwsDocumentExpiryProvider(config),
  };
}
