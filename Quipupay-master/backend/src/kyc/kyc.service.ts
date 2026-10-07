import { BadRequestException, Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { ObservabilityService } from '../observability/observability.service';
import { ChallengeService, type IssuedChallenge } from './challenge.service';
import { StorageService } from './storage.service';
import { RiskEngineService, type DeviceSignals, type RiskInputs } from './risk-engine.service';
import {
  KYC_PROVIDERS,
  type KycProviderSet,
  type FaceProvider,
  type FaceDetection,
  type FaceComparison,
} from './providers/types';
import { cropToFaceBox } from './analysis/image-stats';

/**
 * Compara el rostro del DNI contra la selfie con una red de seguridad.
 *
 * Se intenta primero con la imagen COMPLETA del documento, sin recortar:
 * Rekognition (y cualquier proveedor real) ya hace su propia localización de
 * rostro internamente, y ya sabemos que encuentra una cara ahí porque el
 * paso de análisis del documento (`bestDocumentFace`) la detectó para pasar
 * el gate. Solo si ese intento falla por no poder ubicar un rostro utilizable
 * — matchScore 0 Y confidence 0 es la firma exacta de esa falla en
 * `AwsFaceProvider.compareFaces`, distinta de una comparación real que
 * simplemente no coincidió (esa devuelve confidence ~0.5) — se reintenta con
 * un recorte localizado con margen, por si algo en el resto de la imagen
 * (texto, glare, el diseño del carnet) confunde al comparador.
 */
async function compareDocumentFace(
  provider: FaceProvider,
  fullDocImage: Buffer,
  selfieFace: Buffer,
): Promise<FaceComparison> {
  const direct = await provider.compareFaces(fullDocImage, selfieFace);
  const detectionFailed = direct.matchScore === 0 && direct.confidence === 0;
  if (!detectionFailed) {
    return direct;
  }

  const detection = await provider.detectFace(fullDocImage);
  if (detection.faceCount === 0 || !detection.box) {
    return direct;
  }
  const cropped = await cropToFaceBox(fullDocImage, detection.box);
  return provider.compareFaces(cropped, selfieFace);
}

/** Elige, entre los frames capturados en la selfie, el que mejor sirve para el match facial. */
async function bestSelfieFrame(
  provider: FaceProvider,
  frames: Buffer[],
  neutralFrame?: Buffer,
): Promise<Buffer> {
  // El frame "neutral" (mirando al frente, antes de cualquier instrucción de
  // girar/mirar arriba) es siempre preferible para el match: los frames del
  // reto se capturan a propósito mientras la persona gira la cabeza, así que
  // suelen salir de perfil o inclinados — mal insumo para comparar contra el
  // DNI aunque sean nítidos.
  if (neutralFrame && neutralFrame.length > 0) {
    const detection = await provider.detectFace(neutralFrame);
    if (detection.faceCount > 0) {
      return neutralFrame;
    }
  }

  if (frames.length === 0) {
    return neutralFrame ?? Buffer.alloc(0);
  }
  const scored = await Promise.all(
    frames.map(async (frame) => ({
      frame,
      detection: await provider.detectFace(frame),
    })),
  );
  const withFace = scored.filter((s) => s.detection.faceCount > 0);
  const pool = withFace.length > 0 ? withFace : scored;
  pool.sort((a, b) => b.detection.quality + b.detection.sharpness - (a.detection.quality + a.detection.sharpness));
  return pool[0].frame;
}

/**
 * De las dos tomas del frente del DNI (recta e inclinada) ambas muestran la
 * cara impresa — se detecta la cara en cada una y se elige la que salió más
 * nítida/clara para usarla como referencia del match facial. Antes siempre
 * se usaba la toma recta a ciegas; si esa salió con reflejo/blur y la
 * inclinada quedó mejor, se perdía esa oportunidad.
 */
async function bestDocumentFace(
  provider: FaceProvider,
  frontStraight: Buffer,
  frontTilt: Buffer,
): Promise<{ source: 'doc-front' | 'doc-front-tilt'; detection: FaceDetection }> {
  const [straight, tilt] = await Promise.all([
    provider.detectFace(frontStraight),
    provider.detectFace(frontTilt),
  ]);
  const straightScore = straight.faceCount > 0 ? straight.quality + straight.sharpness : -1;
  const tiltScore = tilt.faceCount > 0 ? tilt.quality + tilt.sharpness : -1;
  return tiltScore > straightScore
    ? { source: 'doc-front-tilt', detection: tilt }
    : { source: 'doc-front', detection: straight };
}

const SESSION_TTL_MS = 30 * 60 * 1000;

export type DocumentFiles = {
  frontStraight: Buffer;
  frontTilt: Buffer;
  backStraight: Buffer;
  backTilt: Buffer;
};

export type SelfiePayload = {
  video?: Buffer;
  frames: Buffer[];
  /**
   * Foto tomada mirando al frente ANTES de la primera instrucción del reto
   * (gira, mira arriba, etc.). Los `frames` del reto se toman a la mitad/al
   * final de cada instrucción a propósito — el rostro suele salir girado o
   * inclinado, que es justo lo que prueba que la persona se mueve de verdad,
   * pero es una entrada pésima para comparar contra el DNI. Este frame es la
   * referencia frontal dedicada para el match facial.
   */
  neutralFrame?: Buffer;
  videoDurationMs: number;
  challengeId: string;
  nonce: string;
  stepTimingsMs: number[];
  device: DeviceSignals;
};

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: ChallengeService,
    private readonly storage: StorageService,
    private readonly identity: IdentityService,
    private readonly risk: RiskEngineService,
    private readonly obs: ObservabilityService,
    @Inject(KYC_PROVIDERS) private readonly providers: KycProviderSet,
  ) {}

  async createSession(dni: string): Promise<{ sessionKey: string }> {
    const sessionKey = this.challenges.newSessionKey();
    await this.prisma.kycSession.create({
      data: { sessionKey, dni, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return { sessionKey };
  }

  issueChallenge(sessionKey: string): Promise<IssuedChallenge> {
    return this.challenges.issue(sessionKey);
  }

  private async requireSession(sessionKey: string) {
    const session = await this.prisma.kycSession.findUnique({ where: { sessionKey } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('La sesión de verificación no existe o expiró');
    }
    return session;
  }

  async analyzeDocument(sessionKey: string, files: DocumentFiles) {
    const session = await this.requireSession(sessionKey);

    const analysis = await this.obs.startSegment('kyc/document-analyze', true, () =>
      this.providers.document.analyze(files),
    );

    // Verificación cruzada con RENIEC (apis.net.pe): si el DNI de la sesión
    // devuelve una identidad válida, el "identityMatch" es alto.
    let identityMatch = 0.3;
    let reniec: Awaited<ReturnType<IdentityService['findByDni']>> | null = null;
    if (session.dni) {
      try {
        reniec = await this.identity.findByDni(session.dni);
        identityMatch = reniec.verified ? 0.95 : 0.5;
      } catch {
        identityMatch = 0.2;
      }
    }

    await this.obs.startSegment('kyc/storage-write', true, () =>
      this.storeMany(sessionKey, [
        ['doc-front', files.frontStraight],
        ['doc-front-tilt', files.frontTilt],
        ['doc-back', files.backStraight],
        ['doc-back-tilt', files.backTilt],
      ]),
    );

    // Verifica ya en este paso que la carita impresa en el DNI sea utilizable
    // para el match facial — si se detecta tarde (recién en la selfie), el
    // usuario ya gastó tiempo grabando el reto de vida para nada. Elige la
    // mejor de las dos tomas del frente (recta o inclinada) para esto.
    // En paralelo, lee la fecha de caducidad Y si el nombre que devolvió
    // RENIEC para ese número de DNI está impreso en la foto (sin esto,
    // alguien podría escribir su propio número de DNI válido y fotografiar
    // el documento físico de otra persona; RENIEC no expone ninguna de las
    // dos cosas por API, hay que leerlas de la imagen).
    const [bestFace, textCheck] = await Promise.all([
      bestDocumentFace(this.providers.face, files.frontStraight, files.frontTilt),
      this.providers.documentExpiry.check(files.frontStraight, reniec?.fullName ?? null),
    ]);
    const reasonCodes = [...analysis.reasonCodes];
    if (bestFace.detection.faceCount === 0) {
      reasonCodes.push('FACE_NOT_DETECTED_IN_DOCUMENT');
    } else if (bestFace.detection.quality < 0.35 || bestFace.detection.sharpness < 0.25) {
      reasonCodes.push('DOC_FACE_LOW_QUALITY');
    }
    if (textCheck.expired === true) {
      reasonCodes.push('DNI_EXPIRED');
    }
    if (textCheck.nameMatch === false) {
      reasonCodes.push('DNI_NAME_MISMATCH');
      // El nombre impreso en el documento no coincide con el que RENIEC
      // devolvió para el número de DNI ingresado — es evidencia más fuerte
      // que la sola respuesta de RENIEC, así que pisa el identityMatch.
      identityMatch = Math.min(identityMatch, 0.1);
    }

    const documentResult = {
      quality: analysis.quality,
      authenticity: analysis.authenticity,
      identityMatch,
      reasonCodes,
      ocrName: reniec?.fullName ?? null,
      facePreferredSource: bestFace.source,
      expiryDate: textCheck.expiryDate,
    };

    await this.prisma.kycSession.update({
      where: { sessionKey },
      data: { documentResult, status: 'DOCUMENT_DONE' },
    });

    return {
      documentQuality: analysis.quality,
      authenticity: analysis.authenticity,
      ocr: { fullName: reniec?.fullName ?? null },
      warnings: reasonCodes,
      expiryDate: textCheck.expiryDate,
    };
  }

  async analyzeSelfie(sessionKey: string, payload: SelfiePayload) {
    const session = await this.requireSession(sessionKey);
    if (!session.documentResult) {
      throw new BadRequestException('Primero debes capturar el documento');
    }

    const challenge = await this.challenges.consume(
      payload.challengeId,
      sessionKey,
      payload.nonce,
    );

    const [liveness, deepfake] = await Promise.all([
      this.obs.startSegment('kyc/liveness-analyze', true, () =>
        this.providers.liveness.analyze({
          frames: payload.frames,
          videoDurationMs: payload.videoDurationMs,
          challenge,
          stepTimingsMs: payload.stepTimingsMs,
        }),
      ),
      this.obs.startSegment('kyc/deepfake-score', true, () =>
        this.providers.deepfake.score(payload.frames),
      ),
    ]);

    // Face match: la mejor de las dos tomas del frente del DNI vs el frame
    // frontal dedicado de la selfie (o el mejor de los frames del reto si
    // ese falló), con reintento por recorte si el comparador no ubica un
    // rostro utilizable en la imagen completa.
    const doc = session.documentResult as { identityMatch?: number; facePreferredSource?: string };
    const docFaceSource = doc.facePreferredSource ?? 'doc-front';
    const [frontFace, selfieFace] = await Promise.all([
      this.readStored(sessionKey, docFaceSource),
      bestSelfieFrame(this.providers.face, payload.frames, payload.neutralFrame),
    ]);
    const faceCmp = await this.obs.startSegment('kyc/face-compare', true, () =>
      compareDocumentFace(this.providers.face, frontFace, selfieFace),
    );

    await this.obs.startSegment('kyc/storage-write', true, () =>
      this.storeMany(sessionKey, [
        ...payload.frames.map((f, i) => [`selfie-frame-${i}`, f] as [string, Buffer]),
        ...(payload.video ? ([['selfie-video', payload.video]] as [string, Buffer][]) : []),
        ...(payload.neutralFrame ? ([['selfie-neutral', payload.neutralFrame]] as [string, Buffer][]) : []),
      ]),
    );

    const inputs: RiskInputs = {
      identityMatch: doc.identityMatch ?? 0.3,
      documentQuality: (session.documentResult as { quality: number }).quality,
      documentAuthenticity: (session.documentResult as { authenticity: number }).authenticity,
      activeChallenge: liveness.signals.challengeCompletion ?? 0,
      passiveLiveness: liveness.score,
      deepfakeScore: deepfake.score,
      faceMatch: faceCmp.matchScore,
      device: payload.device,
      reasonCodes: [
        ...liveness.reasonCodes,
        ...((session.documentResult as { reasonCodes?: string[] }).reasonCodes ?? []),
      ],
    };

    const outcome = await this.risk.evaluate(inputs);

    const selfieResult = {
      liveness: liveness.signals,
      deepfakeScore: deepfake.score,
      faceMatch: faceCmp.matchScore,
      modelVersions: {
        face: this.providers.face.name,
        liveness: this.providers.liveness.name,
        deepfake: this.providers.deepfake.name,
      },
    };

    await this.prisma.kycSession.update({
      where: { sessionKey },
      data: {
        selfieResult,
        riskResult: outcome as unknown as object,
        decision: outcome.decision,
        status: 'DECIDED',
      },
    });

    return outcome;
  }

  async getResult(sessionKey: string) {
    const session = await this.requireSession(sessionKey);
    return {
      status: session.status,
      decision: session.decision,
      risk: session.riskResult,
    };
  }

  private readonly logger = new Logger(KycService.name);

  /**
   * Al registrarse el usuario, copia el resultado del KYC a las tablas
   * definitivas (identity_profiles, document_captures, liveness_checks,
   * biometric_verification_attempts, risk_scores, audit_events).
   */
  async materialize(userId: string, sessionKey: string): Promise<void> {
    const session = await this.prisma.kycSession.findUnique({ where: { sessionKey } });
    if (!session || session.materializedAt) {
      return;
    }

    const risk = (session.riskResult ?? {}) as {
      decision?: string;
      riskScore?: number;
      signals?: Record<string, number>;
      reasonCodes?: string[];
      modelVersion?: string;
    };
    const doc = (session.documentResult ?? {}) as {
      quality?: number;
      authenticity?: number;
      ocrName?: string | null;
    };
    const selfie = (session.selfieResult ?? {}) as {
      faceMatch?: number;
      modelVersions?: Record<string, string>;
    };

    const decision = risk.decision ?? 'REVIEW';
    const identityStatus =
      decision === 'APPROVED'
        ? 'VERIFIED'
        : decision === 'REJECTED'
          ? 'REJECTED'
          : 'REVIEW_REQUIRED';
    const correlationId = randomUUID();

    try {
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.identityProfile.upsert({
          where: { userId },
          create: {
            userId,
            verificationLevel: decision === 'APPROVED' ? 'VERIFIED' : 'BASIC',
            statusCode: identityStatus,
            verifiedAt: decision === 'APPROVED' ? new Date() : null,
          },
          update: {
            verificationLevel: decision === 'APPROVED' ? 'VERIFIED' : 'BASIC',
            statusCode: identityStatus,
          },
        });

        await tx.documentCapture.create({
          data: {
            identityProfileId: profile.id,
            documentType: 'DNI',
            ocrPayload: { fullName: doc.ocrName ?? null },
            qualityScore: doc.quality ?? null,
            statusCode: (doc.authenticity ?? 1) < 0.35 ? "REJECTED" : "APPROVED",
          },
        });

        const liveness = await tx.livenessCheck.create({
          data: {
            userId,
            modelVersion: selfie.modelVersions?.liveness ?? 'mock-liveness@1',
            livenessScore: risk.signals?.passiveLiveness ?? 0,
            thresholdUsed: 0.45,
            decision,
            reasonCode: risk.reasonCodes?.[0] ?? null,
          },
        });

        await tx.biometricVerificationAttempt.create({
          data: {
            userId,
            livenessCheckId: liveness.id,
            modelVersion: selfie.modelVersions?.face ?? 'mock-face@1',
            matchScore: selfie.faceMatch ?? null,
            thresholdUsed: 0.4,
            decision,
            purpose: 'ONBOARDING',
          },
        });

        await tx.riskScore.create({
          data: {
            userId,
            score: risk.riskScore ?? 0,
            decision,
            modelVersion: risk.modelVersion ?? 'quipupay-risk@1',
          },
        });

        await tx.auditEvent.create({
          data: {
            actorUserId: userId,
            eventType: 'KYC_MATERIALIZED',
            entityType: 'identity_profile',
            entityId: profile.id,
            correlationId,
            result: decision,
            metadata: { sessionKey, decision },
          },
        });

        await tx.kycSession.update({
          where: { sessionKey },
          data: { materializedAt: new Date(), status: 'MATERIALIZED' },
        });
      });

      await this.storage.purgeSession(sessionKey);
    } catch (error) {
      this.logger.error(
        `No se pudo materializar el KYC de la sesión ${sessionKey}: ${
          error instanceof Error ? error.message : 'error'
        }`,
      );
    }
  }

  private async storeMany(sessionKey: string, items: [string, Buffer][]) {
    for (const [name, buffer] of items) {
      await this.storage.save(sessionKey, name, buffer, 'image/jpeg', 'KYC_MEDIA');
    }
  }

  private async readStored(sessionKey: string, name: string): Promise<Buffer> {
    return this.storage.read(sessionKey, name);
  }
}
