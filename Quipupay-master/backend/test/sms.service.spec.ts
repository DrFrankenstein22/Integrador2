import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { SmsService } from '../src/identity/sms.service';

function buildConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const CONFIGURED = {
  TELNYX_API_KEY: 'KEY123',
  TELNYX_MESSAGING_PROFILE_ID: 'profile-1',
};

describe('SmsService.sendVerificationCode', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws when Telnyx is not configured at all', async () => {
    const service = new SmsService(buildConfig({}));
    await expect(service.sendVerificationCode('987654321', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when the messaging profile id is missing (API key alone is not enough)', async () => {
    const service = new SmsService(buildConfig({ TELNYX_API_KEY: 'KEY123' }));
    await expect(service.sendVerificationCode('987654321', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('sends to the Peru number in E.164, from the alpha sender, with the messaging profile', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new SmsService(buildConfig(CONFIGURED));

    await service.sendVerificationCode('987654321', '123456');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer KEY123' }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    // Un longcode de EE.UU. no puede mandar SMS a destinos internacionales
    // usando el número como remitente — Telnyx exige un remitente
    // alfanumérico atado al messaging profile para esa ruta.
    expect(body).toEqual({
      from: 'QuipuPay',
      messaging_profile_id: 'profile-1',
      to: '+51987654321',
      text: expect.stringContaining('123456'),
    });
  });

  it('throws when Telnyx responds with an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('{"errors":[{"title":"Alpha sender not configured"}]}'),
    }) as unknown as typeof fetch;
    const service = new SmsService(buildConfig(CONFIGURED));

    await expect(service.sendVerificationCode('987654321', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when the network call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const service = new SmsService(buildConfig(CONFIGURED));

    await expect(service.sendVerificationCode('987654321', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
