/// <reference types="jest" />
import { apiFetch, ApiError } from './client';

const ORIGINAL_URL = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL_URL;
  jest.resetAllMocks();
});

describe('apiFetch', () => {
  test('builds the URL from EXPO_PUBLIC_API_URL and returns parsed JSON on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });

    const result = await apiFetch<{ status: string }>('/health');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/health',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result).toEqual({ status: 'ok' });
  });

  test('throws ApiError with the response status on a non-2xx response', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    await expect(apiFetch('/health')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/health')).rejects.toMatchObject({ status: 500 });
  });

  test('throws when EXPO_PUBLIC_API_URL is not set', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    await expect(apiFetch('/health')).rejects.toThrow('EXPO_PUBLIC_API_URL is not set');
  });
});
