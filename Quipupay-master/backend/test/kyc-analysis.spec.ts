import sharp from 'sharp';

import { imageStats, frameMotion } from '../src/kyc/analysis/image-stats';
import { documentHeuristics } from '../src/kyc/analysis/document-heuristics';
import { videoHeuristics } from '../src/kyc/analysis/video-heuristics';
import { MockFaceProvider } from '../src/kyc/providers/mock/mock-face.provider';
import { MockLivenessProvider } from '../src/kyc/providers/mock/mock-liveness.provider';
import type { ChallengeStep } from '../src/kyc/providers/types';

// --- Fixtures generados con sharp ---
async function noiseImage(w = 600, h = 380): Promise<Buffer> {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < px.length; i += 1) {
    px[i] = Math.floor(Math.random() * 256);
  }
  return sharp(px, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
}

async function flatImage(w = 600, h = 380, value = 128): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: value, g: value, b: value } },
  })
    .jpeg()
    .toBuffer();
}

/** Imagen con una "cara" (elipse clara) en una posición dada: mover = simular movimiento. */
async function faceImage(offsetX = 0, offsetY = 0, w = 600, h = 380): Promise<Buffer> {
  const cx = Math.round(w / 2 + offsetX);
  const cy = Math.round(h / 2 + offsetY);
  const svg = `<svg width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="#3b4a5a"/>
    <ellipse cx="${cx}" cy="${cy}" rx="90" ry="120" fill="#d8b48a"/>
    <circle cx="${cx - 30}" cy="${cy - 20}" r="10" fill="#1a1a1a"/>
    <circle cx="${cx + 30}" cy="${cy - 20}" r="10" fill="#1a1a1a"/>
    <rect x="${cx - 25}" y="${cy + 40}" width="50" height="10" fill="#7a3b3b"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function blur(buf: Buffer): Promise<Buffer> {
  return sharp(buf).blur(12).jpeg().toBuffer();
}

describe('imageStats', () => {
  it('distingue una imagen con textura de una plana', async () => {
    const noisy = await imageStats(await noiseImage());
    const flat = await imageStats(await flatImage());

    expect(noisy.entropy).toBeGreaterThan(flat.entropy);
    expect(flat.contrast).toBeLessThan(noisy.contrast);
  });

  it('detecta sobreexposición', async () => {
    const white = await imageStats(await flatImage(400, 300, 252));
    expect(white.overexposedRatio).toBeGreaterThan(0.8);
  });
});

describe('frameMotion', () => {
  it('da ~0 para la misma imagen y >0 cuando la cara se mueve', async () => {
    const centered = await faceImage(0, 0);
    const moved = await faceImage(70, 40);
    expect(await frameMotion(centered, centered)).toBeLessThan(0.005);
    expect(await frameMotion(centered, moved)).toBeGreaterThan(0.03);
  });
});

describe('documentHeuristics', () => {
  it('una foto nítida y con textura puntúa mejor que una borrosa y plana', async () => {
    const sharpImg = await noiseImage();
    const tilt = await noiseImage();
    const good = await documentHeuristics(
      sharpImg,
      tilt,
      await imageStats(sharpImg),
      await imageStats(tilt),
    );

    const flat = await flatImage();
    const bad = await documentHeuristics(
      await blur(flat),
      flat,
      await imageStats(await blur(flat)),
      await imageStats(flat),
    );

    expect(good.quality).toBeGreaterThan(bad.quality);
    expect(good.authenticity).toBeGreaterThan(bad.authenticity);
    expect(bad.reasonCodes).toContain('DOC_TOO_UNIFORM');
  });
});

describe('videoHeuristics', () => {
  const challenge: ChallengeStep[] = [
    { code: 'LOOK_UP', label: 'Mira arriba', seconds: 3 },
    { code: 'TURN_LEFT', label: 'Gira a la izquierda', seconds: 3 },
    { code: 'BLINK_TWICE', label: 'Parpadea dos veces', seconds: 3 },
  ];

  it('penaliza un challenge incompleto y sin movimiento', async () => {
    const frame = await noiseImage();
    const h = await videoHeuristics([frame, frame, frame], 1000, [500], challenge);
    expect(h.challengeCompletion).toBeLessThan(0.5);
    expect(h.reasonCodes).toContain('CHALLENGE_INCOMPLETE');
    expect(h.reasonCodes).toContain('NO_LIVENESS_MOTION');
  });

  it('aprueba un challenge completo con movimiento y timing correcto', async () => {
    const frames = await Promise.all([
      faceImage(0, 0),
      faceImage(-60, 20),
      faceImage(50, -30),
    ]);
    const h = await videoHeuristics(frames, 9000, [3000, 6000, 9000], challenge);
    expect(h.challengeCompletion).toBe(1);
    expect(h.motionScore).toBe(1);
    expect(h.timingPlausibility).toBe(1);
  });
});

describe('mock providers', () => {
  it('MockFaceProvider detecta un rostro plausible y compara', async () => {
    const face = new MockFaceProvider();
    const img = await noiseImage(400, 500);
    const det = await face.detectFace(img);
    expect(det.faceCount).toBe(1);

    const cmp = await face.compareFaces(img, img);
    expect(cmp.matchScore).toBeGreaterThan(0.7);
  });

  it('MockLivenessProvider rechaza una selfie quieta', async () => {
    const liveness = new MockLivenessProvider();
    const frame = await noiseImage();
    const result = await liveness.analyze({
      frames: [frame, frame, frame],
      videoDurationMs: 1000,
      challenge: [{ code: 'LOOK_UP', label: 'x', seconds: 3 }],
      stepTimingsMs: [400],
    });
    expect(result.decision).toBe('REJECTED');
    expect(result.reasonCodes).toContain('NO_LIVENESS_MOTION');
  });
});
