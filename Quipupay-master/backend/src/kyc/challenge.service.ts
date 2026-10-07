import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { ChallengeStep, ChallengeStepCode } from './providers/types';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const STEPS_PER_CHALLENGE = 4;

// Solo instrucciones claras e inequívocas para alguien que nunca vio este
// flujo: "gira la cabeza" y "sonríe"/"parpadea" no dejan duda de qué hacer.
// Se sacaron "mira arriba/abajo" (el usuario no sabe cuánto es "arriba" con
// el teléfono en la mano, así que casi no se nota el movimiento) y "acerca
// el teléfono" (cambia el encuadre justo cuando se toma la foto — la causa
// más común de que esa captura salga movida/borrosa).
const POOL: Partial<Record<ChallengeStepCode, string>> = {
  TURN_LEFT: 'Gira la cabeza a la izquierda',
  TURN_RIGHT: 'Gira la cabeza a la derecha',
  BLINK_TWICE: 'Parpadea dos veces',
  SMILE: 'Sonríe',
};

const POOL_CODES = Object.keys(POOL) as ChallengeStepCode[];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type IssuedChallenge = {
  challengeId: string;
  steps: ChallengeStep[];
  nonce: string;
  expiresIn: number;
};

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(sessionKey: string): Promise<IssuedChallenge> {
    const steps: ChallengeStep[] = shuffle(POOL_CODES)
      .slice(0, STEPS_PER_CHALLENGE)
      .map((code) => ({ code, label: POOL[code]!, seconds: 3 }));

    const nonce = randomBytes(16).toString('hex');
    const challenge = await this.prisma.livenessChallenge.create({
      data: {
        sessionKey,
        script: steps as unknown as object,
        nonce,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    return {
      challengeId: challenge.id,
      steps,
      nonce,
      expiresIn: Math.floor(CHALLENGE_TTL_MS / 1000),
    };
  }

  /** Devuelve el guion del challenge y lo marca como consumido (un solo uso). */
  async consume(challengeId: string, sessionKey: string, nonce: string): Promise<ChallengeStep[]> {
    const challenge = await this.prisma.livenessChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.sessionKey !== sessionKey) {
      throw new NotFoundException('El challenge no existe para esta sesión');
    }
    if (challenge.nonce !== nonce) {
      throw new BadRequestException('El nonce del challenge no coincide');
    }
    if (challenge.consumedAt) {
      throw new BadRequestException('Este challenge ya fue usado');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El challenge expiró. Solicita uno nuevo');
    }

    await this.prisma.livenessChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    return challenge.script as unknown as ChallengeStep[];
  }

  newSessionKey(): string {
    return randomUUID().replace(/-/g, '');
  }
}
