import { API_URL } from './http';
import type { DeviceSignals } from './device';

export type ChallengeStep = {
  code: string;
  label: string;
  seconds: number;
};

export type KycChallenge = {
  challengeId: string;
  steps: ChallengeStep[];
  nonce: string;
  expiresIn: number;
};

export type DocumentResult = {
  documentQuality: number;
  authenticity: number;
  ocr: { fullName: string | null };
  warnings: string[];
  expiryDate: string | null;
};

export type RiskSignals = {
  identityMatch: number;
  documentQuality: number;
  documentAuthenticity: number;
  activeChallenge: number;
  passiveLiveness: number;
  deepfakeScore: number;
  faceMatch: number;
  deviceTrust: number;
};

export type KycOutcome = {
  decision: 'APPROVED' | 'REVIEW' | 'REJECTED';
  riskScore: number;
  trustScore: number;
  signals: RiskSignals;
  reasonCodes: string[];
  modelVersion: string;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (payload as { message?: string })?.message ?? 'Error en la verificación de identidad',
    );
  }
  return payload as T;
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: form });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (payload as { message?: string })?.message ?? 'Error al subir la verificación',
    );
  }
  return payload as T;
}

export function createKycSession(dni: string): Promise<{ sessionKey: string }> {
  return post('/kyc/session', { dni });
}

export function getKycChallenge(sessionKey: string): Promise<KycChallenge> {
  return post('/kyc/challenge', { sessionKey });
}

function fileEntry(uri: string, name: string) {
  return { uri, name, type: 'image/jpeg' } as unknown as Blob;
}

export function uploadKycDocument(
  sessionKey: string,
  uris: { frontStraight: string; frontTilt: string; backStraight: string; backTilt: string },
): Promise<DocumentResult> {
  const form = new FormData();
  form.append('sessionKey', sessionKey);
  form.append('frontStraight', fileEntry(uris.frontStraight, 'front.jpg'));
  form.append('frontTilt', fileEntry(uris.frontTilt, 'front-tilt.jpg'));
  form.append('backStraight', fileEntry(uris.backStraight, 'back.jpg'));
  form.append('backTilt', fileEntry(uris.backTilt, 'back-tilt.jpg'));
  return postForm('/kyc/document', form);
}

export function uploadKycSelfie(input: {
  sessionKey: string;
  challengeId: string;
  nonce: string;
  videoUri?: string;
  frameUris: string[];
  neutralFrameUri?: string;
  videoDurationMs: number;
  stepTimingsMs: number[];
  device: DeviceSignals;
}): Promise<KycOutcome> {
  const form = new FormData();
  form.append('sessionKey', input.sessionKey);
  form.append('challengeId', input.challengeId);
  form.append('nonce', input.nonce);
  form.append('videoDurationMs', String(input.videoDurationMs));
  form.append('stepTimingsMs', JSON.stringify(input.stepTimingsMs));
  form.append('device', JSON.stringify(input.device));
  if (input.videoUri) {
    form.append('video', { uri: input.videoUri, name: 'selfie.mp4', type: 'video/mp4' } as unknown as Blob);
  }
  if (input.neutralFrameUri) {
    form.append('neutralFrame', fileEntry(input.neutralFrameUri, 'neutral.jpg'));
  }
  input.frameUris.forEach((uri, i) => {
    form.append('frames', fileEntry(uri, `frame-${i}.jpg`));
  });
  return postForm('/kyc/selfie', form);
}

export function getKycResult(sessionKey: string): Promise<{
  status: string;
  decision: string | null;
  risk: KycOutcome | null;
}> {
  return fetch(`${API_URL}/kyc/result/${sessionKey}`).then((r) => r.json());
}
