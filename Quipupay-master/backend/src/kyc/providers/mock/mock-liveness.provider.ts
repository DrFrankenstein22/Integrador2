import { videoHeuristics } from '../../analysis/video-heuristics';
import type { LivenessInput, LivenessProvider, LivenessResult } from '../types';

function decide(score: number): LivenessResult['decision'] {
  if (score >= 0.7) {
    return 'APPROVED';
  }
  if (score >= 0.45) {
    return 'REVIEW';
  }
  return 'REJECTED';
}

/**
 * Liveness pasivo + activo mediante heurísticas de video (sin modelo PAD).
 * Sustituible por AwsLivenessProvider (Rekognition Face Liveness) sin cambios
 * en la app: la app solo sube video + snapshots + timings.
 */
export class MockLivenessProvider implements LivenessProvider {
  readonly name = 'mock-liveness@1';

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
      decision: decide(score),
      signals: {
        challengeCompletion: h.challengeCompletion,
        motionScore: h.motionScore,
        timingPlausibility: h.timingPlausibility,
      },
      reasonCodes: h.reasonCodes,
    };
  }
}
