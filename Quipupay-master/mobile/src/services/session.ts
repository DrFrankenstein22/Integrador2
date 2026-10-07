import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from './authApi';

const SESSION_KEY = 'quipupay.session';

export type StoredSession = {
  accessToken: string;
  user: AuthUser;
};

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch {
    // El almacenamiento seguro puede fallar en algunos entornos; la sesión
    // seguirá viva en memoria durante el uso actual de la app.
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.accessToken || !parsed?.user) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Nada que hacer: si no se puede borrar, la sesión en memoria ya se limpió.
  }
}
