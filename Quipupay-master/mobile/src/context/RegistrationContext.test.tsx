import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { RegistrationProvider, useRegistration } from './RegistrationContext';

function wrapper({ children }: PropsWithChildren) {
  return <RegistrationProvider>{children}</RegistrationProvider>;
}

describe('useRegistration', () => {
  test('starts with an empty dni and terms not accepted', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    expect(result.current.state.dni).toBe('');
    expect(result.current.state.acceptedTerms).toBe(false);
  });

  test('pressDniKey appends digits up to 8', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => {
      '741289055'.split('').forEach((digit) => result.current.pressDniKey(digit));
    });
    expect(result.current.state.dni).toBe('74128905');
  });

  test('toggleAcceptedTerms flips the flag', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => result.current.toggleAcceptedTerms());
    expect(result.current.state.acceptedTerms).toBe(true);
    await act(async () => result.current.toggleAcceptedTerms());
    expect(result.current.state.acceptedTerms).toBe(false);
  });

  test('setDocShot guarda cada toma del documento por separado', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    expect(result.current.state.docShots).toEqual({});

    await act(async () => result.current.setDocShot('frontStraight', 'uri://front'));
    await act(async () => result.current.setDocShot('backTilt', 'uri://back-tilt'));

    expect(result.current.state.docShots.frontStraight).toBe('uri://front');
    expect(result.current.state.docShots.backTilt).toBe('uri://back-tilt');
  });

  test('setKycOutcome guarda la decisión del motor de riesgo', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () =>
      result.current.setKycOutcome({
        decision: 'APPROVED',
        riskScore: 8,
        trustScore: 92,
        signals: {
          identityMatch: 1,
          documentQuality: 1,
          documentAuthenticity: 1,
          activeChallenge: 1,
          passiveLiveness: 1,
          deepfakeScore: 1,
          faceMatch: 1,
          deviceTrust: 1,
        },
        reasonCodes: [],
        modelVersion: 'quipupay-risk@1',
      }),
    );
    expect(result.current.state.kycOutcome?.decision).toBe('APPROVED');
  });

  test('el flujo de verificación de correo guarda el challenge y marca verificado', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => result.current.setEmail('persona@correo.com'));
    await act(async () => result.current.setEmailOtpChallenge('challenge-1'));
    await act(async () => result.current.markEmailVerified());

    expect(result.current.state.email).toBe('persona@correo.com');
    expect(result.current.state.emailOtpChallengeId).toBe('challenge-1');
    expect(result.current.state.emailVerified).toBe(true);
  });

  test('cambiar el correo invalida una verificación anterior', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => result.current.setEmail('persona@correo.com'));
    await act(async () => result.current.setEmailOtpChallenge('challenge-1'));
    await act(async () => result.current.markEmailVerified());

    await act(async () => result.current.setEmail('otra@correo.com'));

    expect(result.current.state.emailVerified).toBe(false);
    expect(result.current.state.emailOtpChallengeId).toBeNull();
  });

  test('setIdentity guarda el nombre completo y por separado', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () =>
      result.current.setIdentity({
        fullName: 'JESUS ALBERTO GARCIA LOPEZ',
        firstName: 'JESUS ALBERTO',
        lastName: 'GARCIA LOPEZ',
      }),
    );
    expect(result.current.state.fullName).toBe('JESUS ALBERTO GARCIA LOPEZ');
    expect(result.current.state.firstName).toBe('JESUS ALBERTO');
    expect(result.current.state.lastName).toBe('GARCIA LOPEZ');
    expect(result.current.state.identityVerified).toBe(true);
  });

  test('clearIdentity borra el nombre guardado', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () =>
      result.current.setIdentity({
        fullName: 'JESUS ALBERTO GARCIA LOPEZ',
        firstName: 'JESUS ALBERTO',
        lastName: 'GARCIA LOPEZ',
      }),
    );
    await act(async () => result.current.clearIdentity());
    expect(result.current.state.fullName).toBe('');
    expect(result.current.state.firstName).toBe('');
    expect(result.current.state.lastName).toBe('');
    expect(result.current.state.identityVerified).toBe(false);
  });

  test('pressPinKey appends digits up to 6', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => {
      '1234567'.split('').forEach((digit) => result.current.pressPinKey(digit));
    });
    expect(result.current.state.pin).toBe('123456');
  });

  test('reset restores the initial state', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    await act(async () => {
      result.current.pressDniKey('7');
      result.current.toggleAcceptedTerms();
    });
    await act(async () => result.current.reset());
    expect(result.current.state.dni).toBe('');
    expect(result.current.state.acceptedTerms).toBe(false);
  });

  test('throws when used outside RegistrationProvider', async () => {
    let error: Error | null = null;
    try {
      await renderHook(() => useRegistration());
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeTruthy();
    expect(error?.message).toBe('useRegistration must be used within a RegistrationProvider');
  });
});
