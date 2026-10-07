import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TELNYX_MESSAGES_URL = 'https://api.telnyx.com/v2/messages';

// Enviar SMS a Perú desde un número de EE.UU. (longcode) requiere un
// remitente alfanumérico en vez del número — Telnyx rechaza el número
// como "from" para destinos internacionales sin eso (visto en la
// respuesta real de la API: "Alpha sender not configured"). El
// remitente alfanumérico va atado al messaging profile, no al número.
const ALPHA_SENDER = 'QuipuPay';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /** Los celulares se guardan como 9 dígitos sin prefijo (formato peruano
   * de este proyecto) — Telnyx exige E.164, así que se antepone +51 acá,
   * en el borde con el proveedor externo, no en el resto del código. */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const messagingProfileId = this.config.get<string>('TELNYX_MESSAGING_PROFILE_ID');

    if (!apiKey || !messagingProfileId) {
      throw new ServiceUnavailableException(
        'El servicio de SMS no está configurado',
      );
    }

    let response: Response;

    try {
      response = await fetch(TELNYX_MESSAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: ALPHA_SENDER,
          messaging_profile_id: messagingProfileId,
          to: `+51${phone}`,
          text: `${code} es tu código de verificación de QuipuPay. Vence en 5 minutos.`,
        }),
      });
    } catch (error) {
      this.logger.error('No se pudo conectar con Telnyx', error);
      throw new ServiceUnavailableException(
        'No se pudo conectar con el proveedor de SMS',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Telnyx rechazó el envío (${response.status}): ${body}`);
      throw new ServiceUnavailableException('No se pudo enviar el SMS de verificación');
    }
  }
}
