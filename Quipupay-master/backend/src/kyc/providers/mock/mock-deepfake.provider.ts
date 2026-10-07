import { imageStats } from '../../analysis/image-stats';
import type { DeepfakeProvider, DeepfakeResult } from '../types';

/**
 * Stand-in de un detector de deepfake (EfficientNet / Xception / ViT).
 * Heurística: los deepfakes suelen tener textura de piel inconsistente entre
 * frames y entropía anormalmente baja/uniforme. Sin modelo real, este proveedor
 * devuelve un score alto salvo señales groseras. Sustituible sin tocar la app.
 */
export class MockDeepfakeProvider implements DeepfakeProvider {
  readonly name = 'mock-deepfake@1';

  async score(frames: Buffer[]): Promise<DeepfakeResult> {
    if (frames.length === 0) {
      return { score: 0.5, decision: 'REVIEW' };
    }

    const stats = await Promise.all(frames.map((f) => imageStats(f)));
    const entropies = stats.map((s) => s.entropy);
    const mean = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const variance =
      entropies.reduce((a, b) => a + (b - mean) ** 2, 0) / entropies.length;

    // Entropía muy baja o casi sin variación entre frames = sospechoso.
    let score = 0.93;
    if (mean < 2.8) {
      score -= 0.4;
    } else if (mean < 3.8) {
      score -= 0.15;
    }
    if (variance < 0.008 && frames.length > 2) {
      score -= 0.2;
    }
    score = Math.max(0, Math.min(1, score));

    return {
      score: Number(score.toFixed(3)),
      decision: score >= 0.6 ? 'APPROVED' : score >= 0.35 ? 'REVIEW' : 'REJECTED',
    };
  }
}
