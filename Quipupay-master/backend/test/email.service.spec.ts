import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

import { EmailService } from '../src/identity/email.service';

function buildConfig(apiKey: string | undefined): ConfigService {
  return { get: () => apiKey } as unknown as ConfigService;
}

describe('EmailService.sendVerificationCode', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('throws when RESEND_API_KEY is not configured', async () => {
    const service = new EmailService(buildConfig(undefined));
    await expect(service.sendVerificationCode('persona@correo.com', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends the code to the given address', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const service = new EmailService(buildConfig('re_test_key'));

    await service.sendVerificationCode('persona@correo.com', '123456');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'persona@correo.com',
        subject: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
        text: expect.stringContaining('123456'),
      }),
    );

    // El logo va embebido en base64 en el HTML (los correos no pueden
    // cargar imágenes desde los assets del proyecto) — y el texto plano
    // es el respaldo para clientes que no rendericen HTML.
    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain('data:image/png;base64,');
    expect(call.text).not.toContain('<');
  });

  it('throws when Resend returns an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'invalid domain' } });
    const service = new EmailService(buildConfig('re_test_key'));

    await expect(service.sendVerificationCode('persona@correo.com', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
