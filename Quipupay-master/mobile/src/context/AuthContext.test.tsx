import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { saveSession } from '../services/session';
import { lookupDni } from '../services/identityApi';

jest.mock('../services/identityApi', () => ({
  lookupDni: jest.fn(),
}));

const lookupDniMock = lookupDni as jest.MockedFunction<typeof lookupDni>;

function wrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    lookupDniMock.mockReset();
    lookupDniMock.mockRejectedValue(new Error('identity unavailable'));
  });

  test('starts unauthenticated', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  test('signIn sets isAuthenticated to true', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () =>
      result.current.signIn({
        accessToken: 'token-123',
        user: { id: 'u1', dni: '12345678', phone: '999999999', email: null, status: 'ACTIVE' },
      }),
    );
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('signOut sets isAuthenticated back to false', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () =>
      result.current.signIn({
        accessToken: 'token-123',
        user: { id: 'u1', dni: '12345678', phone: '999999999', email: null, status: 'ACTIVE' },
      }),
    );
    await act(async () => result.current.signOut());
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('does not authenticate without a usable token', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.signIn());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLocked).toBe(true);
  });

  test('a saved session locks the app instead of authenticating it right away', async () => {
    await saveSession({
      accessToken: 'token-123',
      user: { id: 'u1', dni: '12345678', phone: '999999999', email: null, status: 'ACTIVE' },
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLocked).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.lastDni).toBe('12345678');
  });

  test('signIn without a session unlocks a previously locked session', async () => {
    await saveSession({
      accessToken: 'token-123',
      user: { id: 'u1', dni: '12345678', phone: '999999999', email: null, status: 'ACTIVE' },
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLocked).toBe(true));

    await act(async () => result.current.signIn());

    expect(result.current.isLocked).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('greets by first name when RENIEC name is available', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    // Espera a que el efecto de arranque termine de leer la sesión guardada
    // (puede quedar una de una prueba anterior) antes de hacer signIn acá —
    // si no, esa lectura asíncrona puede resolver después y pisar el estado.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () =>
      result.current.signIn({
        accessToken: 'token-456',
        user: {
          id: 'u2',
          dni: '70813152',
          phone: '999999999',
          email: null,
          status: 'ACTIVE',
          firstName: 'JESUS ALBERTO',
        },
      }),
    );

    expect(result.current.userName).toBe('Jesus');
  });

  test('hydrates a missing name from the DNI lookup', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    lookupDniMock.mockResolvedValueOnce({
      dni: '70813152',
      fullName: 'JESUS ALBERTO GARCIA LOPEZ',
      names: 'JESUS ALBERTO',
      paternalSurname: 'GARCIA',
      maternalSurname: 'LOPEZ',
      verificationCode: null,
      verified: true,
      source: 'APIS_NET_PE',
    });
    await act(async () =>
      result.current.signIn({
        accessToken: 'token-789',
        user: { id: 'u3', dni: '70813152', phone: '999999999', email: null, status: 'ACTIVE' },
      }),
    );

    await waitFor(() => expect(result.current.userName).toBe('Jesus'));
    expect(lookupDniMock).toHaveBeenCalledWith('70813152');
  });

  test('falls back to a DNI-based placeholder when the name cannot be recovered', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () =>
      result.current.signIn({
        accessToken: 'token-789',
        user: { id: 'u3', dni: '70813152', phone: '999999999', email: null, status: 'ACTIVE' },
      }),
    );

    expect(result.current.userName).toBe('Usuario 3152');
  });

  test('throws when used outside AuthProvider', async () => {
    let error: Error | null = null;
    try {
      await renderHook(() => useAuth());
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeTruthy();
    expect(error?.message).toBe('useAuth must be used within an AuthProvider');
  });
});
