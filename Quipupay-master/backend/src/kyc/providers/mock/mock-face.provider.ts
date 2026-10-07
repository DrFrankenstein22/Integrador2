import { imageStats } from '../../analysis/image-stats';
import type { FaceComparison, FaceDetection, FaceProvider } from '../types';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Stand-in de un motor de reconocimiento facial (ArcFace / AWS Rekognition).
 * NO hace reconocimiento real: deriva scores de estadísticas de imagen para
 * poder probar el flujo sin costo. La interfaz FaceProvider permite cambiar a
 * AwsFaceProvider sin tocar la app.
 */
export class MockFaceProvider implements FaceProvider {
  readonly name = 'mock-face@1';

  async detectFace(image: Buffer): Promise<FaceDetection> {
    const stats = await imageStats(image);
    const bright = stats.meanBrightness > 40 && stats.meanBrightness < 235;
    const bigEnough = stats.megapixels > 0.05;
    const faceCount = bright && bigEnough ? 1 : 0;
    return {
      faceCount,
      quality: clamp01(
        (stats.sharpness / 6) * 0.5 + (stats.entropy / 8) * 0.3 + (bright ? 0.2 : 0),
      ),
      sharpness: stats.sharpness,
    };
  }

  async compareFaces(reference: Buffer, probe: Buffer): Promise<FaceComparison> {
    const [a, b] = await Promise.all([imageStats(reference), imageStats(probe)]);

    if (a.megapixels < 0.02 || b.megapixels < 0.02) {
      return { matchScore: 0, confidence: 0.2 };
    }

    // Similitud aproximada por características globales de la cara.
    const brightnessSim = 1 - Math.min(1, Math.abs(a.meanBrightness - b.meanBrightness) / 120);
    const contrastSim = 1 - Math.min(1, Math.abs(a.contrast - b.contrast) / 60);
    const textureSim = 1 - Math.min(1, Math.abs(a.entropy - b.entropy) / 4);
    const aspectA = a.width / Math.max(a.height, 1);
    const aspectB = b.width / Math.max(b.height, 1);
    const aspectSim = 1 - Math.min(1, Math.abs(aspectA - aspectB) / 1.5);

    const raw =
      brightnessSim * 0.25 + contrastSim * 0.2 + textureSim * 0.35 + aspectSim * 0.2;
    // El mock tiende a "pasar" salvo imágenes muy dispares (modo demo).
    const matchScore = clamp01(0.45 + raw * 0.55);

    return {
      matchScore: Number(matchScore.toFixed(3)),
      confidence: 0.6,
    };
  }
}
