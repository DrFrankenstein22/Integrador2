import { collectDeviceInfo, type DeviceInfo } from './device';

export type AuthUser = {
  id: string;
  dni: string;
  phone: string;
  email: string | null;
  status: string;
  /** Nombre validado por RENIEC en el registro. Null en cuentas creadas
   * antes de que existiera este campo. */
  firstName?: string | null;
};

type RegisterPayload = {
  dni: string;
  phone: string;
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  kycSessionKey?: string;
};

type LoginPayload = {
  dni: string;
  password: string;
};

type RegisterResponse = {
  message: string;
  user: AuthUser & { createdAt: string };
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  /** true = ya habíamos visto este teléfono con esta cuenta; false = es la primera vez. */
  deviceRecognized?: boolean;
  user: AuthUser;
};

type WithDevice<T> = T & { device: DeviceInfo };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const message = (payload as { message?: unknown }).message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join('\n');
  }

  return fallback;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('No se pudo conectar con Quipupay. Verifica que el backend esté encendido.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Ocurrió un error al comunicarse con Quipupay.'));
  }

  return payload as T;
}

async function withDevice<T extends object>(payload: T): Promise<WithDevice<T>> {
  const device = await collectDeviceInfo();
  return { ...payload, device };
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>('/register', await withDevice(payload));
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/login', await withDevice(payload));
}
