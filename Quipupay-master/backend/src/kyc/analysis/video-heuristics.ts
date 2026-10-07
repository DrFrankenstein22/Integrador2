import type { ChallengeStep } from '../providers/types';
import { frameMotion } from './image-stats';

export type VideoHeuristics = {
  challengeCompletion: number; // 0..1
  timingPlausibility: number; // 0..1
  motionScore: number; // 0..1 (movimiento humano entre pasos)
  reasonCodes: string[];
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Evalúa el video del challenge activo:
 * - challengeCompletion: cuántos pasos tienen una marca de tiempo válida.
 * - timingPlausibility: la duración total y el espaciado entre pasos deben
 *   coincidir con el guion (demasiado corto = replay / se saltó pasos).
 * - motionScore: debe haber movimiento real entre los snapshots de cada paso
 *   (una foto o un video quieto puntúan 0).
 */
export async function videoHeuristics(
  frames: Buffer[],
  videoDurationMs: number,
  stepTimingsMs: number[],
  challenge: ChallengeStep[],
): Promise<VideoHeuristics> {
  const reasonCodes: string[] = [];
  const expectedMs = challenge.reduce((sum, step) => sum + step.seconds * 1000, 0);

  // Completitud: marcas de tiempo monótonas y dentro de la duración.
  let validSteps = 0;
  let lastTiming = -1;
  for (const t of stepTimingsMs) {
    if (t > lastTiming && t <= videoDurationMs + 1500) {
      validSteps += 1;
      lastTiming = t;
    }
  }
  const challengeCompletion = clamp01(validSteps / Math.max(challenge.length, 1));
  if (challengeCompletion < 0.75) {
    reasonCodes.push('CHALLENGE_INCOMPLETE');
  }

  // Timing: la duración debe estar cerca de la esperada.
  const ratio = videoDurationMs / Math.max(expectedMs, 1);
  const timingPlausibility =
    ratio < 0.5 ? 0.1 : ratio < 0.75 ? 0.5 : ratio > 2.5 ? 0.5 : 1;
  if (ratio < 0.5) {
    reasonCodes.push('VIDEO_TOO_SHORT');
  }

  // Movimiento entre snapshots consecutivos.
  let motionSum = 0;
  let pairs = 0;
  for (let i = 1; i < frames.length; i += 1) {
    motionSum += await frameMotion(frames[i - 1], frames[i]);
    pairs += 1;
  }
  const avgMotion = pairs > 0 ? motionSum / pairs : 0;
  // Movimiento humano real entre pasos del challenge: ~0.02..0.4 de diferencia
  // normalizada tras reducir a 64x64. Una foto o un video congelado dan ~0.
  const motionScore =
    avgMotion < 0.008
      ? 0.05
      : avgMotion < 0.02
        ? 0.5
        : avgMotion > 0.5
          ? 0.4
          : 1;
  if (avgMotion < 0.008) {
    reasonCodes.push('NO_LIVENESS_MOTION');
  }

  return {
    challengeCompletion,
    timingPlausibility,
    motionScore,
    reasonCodes,
  };
}
