import type { ImageStats } from './image-stats';
import { frameMotion } from './image-stats';

export type DocumentHeuristics = {
  quality: number; // 0..1
  authenticity: number; // 0..1 (bajo = probable pantalla / impresión / reenvío)
  reasonCodes: string[];
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Heurísticas de calidad y autenticidad de la foto del DNI, sin modelos de IA.
 * - quality: nitidez + resolución + iluminación + ausencia de glare.
 * - authenticity: penaliza señales de "foto de una pantalla / impresión / reenvío":
 *   entropía baja (poca textura), imagen demasiado uniforme, glare en bandas,
 *   y que la toma recta y la inclinada sean casi idénticas (sin cambio de perspectiva real).
 */
export async function documentHeuristics(
  straight: Buffer,
  tilt: Buffer,
  straightStats: ImageStats,
  tiltStats: ImageStats,
): Promise<DocumentHeuristics> {
  const reasonCodes: string[] = [];

  // --- Calidad ---
  const resolutionScore = clamp01((straightStats.megapixels - 0.3) / 1.7); // 0.3MP..2MP
  const sharpnessScore = clamp01((straightStats.sharpness - 1) / 6);
  const brightnessScore =
    straightStats.meanBrightness > 60 && straightStats.meanBrightness < 220 ? 1 : 0.3;
  const glarePenalty = clamp01(straightStats.overexposedRatio / 0.12); // 12% white = full penalty
  const quality = clamp01(
    resolutionScore * 0.35 + sharpnessScore * 0.35 + brightnessScore * 0.2 + (1 - glarePenalty) * 0.1,
  );

  if (resolutionScore < 0.3) {
    reasonCodes.push('DOC_LOW_RESOLUTION');
  }
  if (sharpnessScore < 0.3) {
    reasonCodes.push('DOC_BLURRY');
  }
  if (glarePenalty > 0.6) {
    reasonCodes.push('DOC_GLARE');
  }

  // --- Autenticidad ---
  const textureScore = clamp01((straightStats.entropy - 3.5) / 3); // >6.5 = mucha textura (real)
  const uniformityPenalty = straightStats.contrast < 22 ? 0.6 : 0; // imagen plana
  const perspectiveDelta = await frameMotion(straight, tilt);
  const perspectiveScore = clamp01(perspectiveDelta / 0.08); // el tilt debe cambiar algo
  const glareBandPenalty = straightStats.overexposedRatio > 0.05 ? 0.25 : 0;

  const authenticity = clamp01(
    textureScore * 0.5 + perspectiveScore * 0.35 + 0.15 - uniformityPenalty - glareBandPenalty,
  );

  if (textureScore < 0.35) {
    reasonCodes.push('DOC_LOW_TEXTURE');
  }
  if (perspectiveScore < 0.3) {
    reasonCodes.push('DOC_NO_PARALLAX');
  }
  if (uniformityPenalty > 0) {
    reasonCodes.push('DOC_TOO_UNIFORM');
  }
  if (authenticity < 0.35) {
    reasonCodes.push('DOC_SCREEN_CAPTURE');
  }

  void tiltStats;
  return { quality, authenticity, reasonCodes };
}
