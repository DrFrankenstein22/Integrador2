const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export type IdentityResult = {
  dni: string;
  fullName: string;
  names: string;
  paternalSurname: string;
  maternalSurname: string;
  verificationCode: number | null;
  verified: boolean;
  source: string;
};

type ApiError = {
  message?: string | string[];
};

export type OtpRequestResult = {
  challengeId: string;
  expiresIn: number;
  devCode?: string;
};

export async function requestPhoneOtp(phone: string): Promise<OtpRequestResult> {
  const response = await fetch(`${API_URL}/identity/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar el código de verificación');
  }

  return (await response.json()) as OtpRequestResult;
}

export async function verifyPhoneOtp(challengeId: string, code: string): Promise<void> {
  const response = await fetch(`${API_URL}/identity/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    const message = Array.isArray(body?.message)
      ? body?.message.join('. ')
      : body?.message;
    throw new Error(message ?? 'El código ingresado no es correcto');
  }
}

export async function requestEmailOtp(email: string): Promise<OtpRequestResult> {
  const response = await fetch(`${API_URL}/identity/email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    const message = Array.isArray(body?.message) ? body?.message.join('. ') : body?.message;
    throw new Error(message ?? 'No se pudo enviar el código de verificación');
  }

  return (await response.json()) as OtpRequestResult;
}

export async function verifyEmailOtp(challengeId: string, code: string): Promise<void> {
  const response = await fetch(`${API_URL}/identity/email-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    const message = Array.isArray(body?.message)
      ? body?.message.join('. ')
      : body?.message;
    throw new Error(message ?? 'El código ingresado no es correcto');
  }
}

export async function lookupDni(dni: string): Promise<IdentityResult> {
  const response = await fetch(`${API_URL}/identity/dni/${dni}`);

  if (!response.ok) {
    let message = 'No fue posible validar el DNI';

    try {
      const body = (await response.json()) as ApiError;
      if (Array.isArray(body.message)) {
        message = body.message.join('. ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Conserva el mensaje genérico si la respuesta no tiene JSON válido.
    }

    throw new Error(message);
  }

  return (await response.json()) as IdentityResult;
}
