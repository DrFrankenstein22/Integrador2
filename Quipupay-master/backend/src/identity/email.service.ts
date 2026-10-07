import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// josegranda.net.pe es un dominio verificado en Resend (prestado mientras
// Quipupay no tiene uno propio) — a diferencia de resend.dev (el remitente
// de pruebas), un dominio verificado permite mandar a cualquier correo real,
// no solo al del dueño de la cuenta de Resend. El día que Quipupay tenga su
// propio dominio verificado, solo hay que cambiar esta constante.
const FROM_ADDRESS = 'QuipuPay <verificacion@josegranda.net.pe>';

// Logo de Quipupay, 96x96, embebido en base64 (~8.6KB) — los correos no
// pueden cargar imágenes desde `require()`/assets del proyecto, así que se
// incrusta directo en el HTML. Se usa la versión chica a propósito: el
// ícono original (1024x1024, ~1.3MB) infla el correo y puede disparar
// filtros de spam por tamaño.
const LOGO_BASE64 =
  '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';

@Injectable()
export class EmailService {
  private client: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Resend {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El servicio de correo no está configurado',
      );
    }

    this.client = new Resend(apiKey);
    return this.client;
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `${code} es tu código de verificación de QuipuPay`,
      html: buildVerificationEmail(code),
      text: `Confirma tu correo para seguir con tu registro en QuipuPay.\n\nTu código: ${code}\n\nEste código vence en 5 minutos. Si no fuiste tú, ignora este correo.`,
    });

    if (error) {
      throw new ServiceUnavailableException(
        'No se pudo enviar el correo de verificación',
      );
    }
  }
}

/**
 * Tabla + estilos en línea (no <style> ni flexbox/grid) a propósito: es lo
 * único que se ve igual en todos los clientes de correo (Gmail, Outlook,
 * Apple Mail incluidos) — CSS moderno se recorta o se ignora en varios de
 * ellos.
 */
function buildVerificationEmail(code: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background-color:#F3F4F6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="background-color:#0B1F3A; padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;">
                      <img src="data:image/png;base64,${LOGO_BASE64}" width="40" height="40" alt="QuipuPay" style="display:block; border-radius:10px;" />
                    </td>
                    <td style="font-size:19px; font-weight:700; color:#FFFFFF; vertical-align:middle;">
                      QuipuPay
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <p style="margin:0 0 24px 0; font-size:15px; line-height:22px; color:#111827;">
                  Confirma tu correo para seguir con tu registro en QuipuPay.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFF4FF; border:1px solid #DCE6FF; border-radius:12px;">
                  <tr>
                    <td align="center" style="padding:24px 16px;">
                      <span style="font-size:34px; font-weight:700; letter-spacing:8px; color:#0B1F3A; font-family:'Courier New',monospace;">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0 0; font-size:12.5px; line-height:19px; color:#6B7280;">
                  Este código vence en 5 minutos. Si no fuiste tú, ignora este correo — tu cuenta sigue segura.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E7EB;">
                  <tr>
                    <td style="padding-top:20px; font-size:11.5px; line-height:17px; color:#9CA3AF;">
                      QuipuPay · Banca digital para el Perú<br />
                      Este es un correo automático, por favor no respondas directamente.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
