export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class OfflineError extends Error {
  constructor() {
    super('No se pudo conectar con Quipupay. Revisa tu conexión a internet.');
    this.name = 'OfflineError';
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

function messageFromPayload(payload: unknown, fallback: string): string {
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

export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new OfflineError();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageFromPayload(payload, 'Ocurrió un error al comunicarse con Quipupay.'),
    );
  }

  return payload as T;
}
