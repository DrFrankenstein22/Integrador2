import { ApiError, OfflineError, authFetch, setAuthToken } from './http';

describe('authFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    setAuthToken(null);
  });

  it('injects the bearer token when set', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    setAuthToken('abc123');

    await authFetch('/accounts');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('maps a non-ok response to ApiError with the backend message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Ya tienes 3 cuentas' }),
    }) as unknown as typeof fetch;

    await expect(authFetch('/accounts', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Ya tienes 3 cuentas',
    });
    expect(new ApiError(1, 'x')).toBeInstanceOf(Error);
  });

  it('throws OfflineError when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    await expect(authFetch('/accounts')).rejects.toBeInstanceOf(OfflineError);
  });
});
