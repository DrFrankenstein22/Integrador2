import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

const OTP_TTL_SECONDS = 300;
const PHONE_PURPOSE = 'PHONE_VERIFICATION';
const EMAIL_PURPOSE = 'EMAIL_VERIFICATION';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  /**
   * El código de prueba se expone mientras no haya un proveedor de SMS real
   * conectado (SMS_PROVIDER sin configurar) — independiente de NODE_ENV. Así,
   * en modo demo el código se ve tanto en desarrollo como en el servidor de
   * producción; el día que se active un proveedor real (SMS_PROVIDER=telnyx)
   * deja de exponerse automáticamente y se manda el SMS de verdad.
   */
  private get hasSmsProvider(): boolean {
    const provider = this.config.get<string>('SMS_PROVIDER');
    return Boolean(provider && provider.toLowerCase() !== 'none');
  }

  async request(phone: string) {
    const code = await this.createChallenge('SMS', phone, PHONE_PURPOSE);

    if (this.hasSmsProvider) {
      await this.sms.sendVerificationCode(phone, code.code);
      return { challengeId: code.challengeId, expiresIn: OTP_TTL_SECONDS };
    }

    // MVP académico: sin proveedor de SMS configurado, el código se
    // devuelve para poder completar el flujo (modo demo).
    return {
      challengeId: code.challengeId,
      expiresIn: OTP_TTL_SECONDS,
      devCode: code.code,
    };
  }

  /** A diferencia del SMS, el correo sí se envía de verdad (vía Resend) —
   * no hay modo demo para este canal. */
  async requestEmail(email: string) {
    const { challengeId, code } = await this.createChallenge(
      'EMAIL',
      email,
      EMAIL_PURPOSE,
    );

    await this.email.sendVerificationCode(email, code);

    return { challengeId, expiresIn: OTP_TTL_SECONDS };
  }

  async verify(challengeId: string, code: string) {
    const challenge = await this.consumeChallenge(challengeId, code, PHONE_PURPOSE);
    return { verified: true, phone: challenge.destination };
  }

  async verifyEmail(challengeId: string, code: string) {
    const challenge = await this.consumeChallenge(challengeId, code, EMAIL_PURPOSE);
    return { verified: true, email: challenge.destination };
  }

  private async createChallenge(channel: string, destination: string, purpose: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(code, 8);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        channel,
        destination,
        otpHash,
        purpose,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      },
    });

    return { challengeId: challenge.id, code };
  }

  private async consumeChallenge(challengeId: string, code: string, purpose: string) {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.purpose !== purpose) {
      throw new NotFoundException('El código solicitado no existe');
    }

    if (challenge.consumedAt) {
      throw new BadRequestException('Este código ya fue usado');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El código expiró. Solicita uno nuevo');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException('Superaste los intentos. Solicita un código nuevo');
    }

    const valid = await bcrypt.compare(code, challenge.otpHash);

    if (!valid) {
      await this.prisma.otpChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('El código ingresado no es correcto');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    return challenge;
  }
}
