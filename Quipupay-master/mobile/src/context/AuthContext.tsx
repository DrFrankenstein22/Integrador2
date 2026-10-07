import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { queryClient } from '@/src/api/queryClient';
import type { AuthUser } from '@/src/services/authApi';
import { setAuthToken } from '@/src/services/http';
import { lookupDni, type IdentityResult } from '@/src/services/identityApi';
import {
  clearSession,
  loadSession,
  saveSession,
  type StoredSession,
} from '@/src/services/session';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * true = ya había una sesión guardada en este teléfono de un login
   * anterior, pero todavía no se confirmó con huella/Face ID o la clave en
   * esta apertura de la app — no es lo mismo que "sin cuenta": el usuario
   * ya existe, solo falta el desbloqueo rápido de esta vez.
   */
  isLocked: boolean;
  userName: string;
  accessToken: string | null;
  user: AuthUser | null;
  lastDni: string;
  setLoginDni: (dni: string) => void;
  signIn: (session?: StoredSession) => void;
  signOut: () => void;
  requirePinUnlock: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ACCOUNT_QUERY_KEY = ['accounts'] as const;
const MOVEMENT_QUERY_KEY = ['movements'] as const;

function identityFirstName(identity: IdentityResult): string | null {
  const names = identity.names?.trim();
  if (names) {
    return names;
  }

  const firstToken = identity.fullName?.trim().split(/\s+/)[0];
  return firstToken || null;
}

function refreshPrivateQueries() {
  queryClient.removeQueries({ queryKey: ACCOUNT_QUERY_KEY });
  queryClient.removeQueries({ queryKey: MOVEMENT_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
}

function decodeJwtPayload(token: string): { exp?: unknown } | null {
  const payload = token.split('.')[1];
  if (!payload || typeof atob !== 'function') {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(padded)) as { exp?: unknown };
  } catch {
    return null;
  }
}

function isTokenUsable(token: string | null): boolean {
  if (!token) {
    return false;
  }

  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') {
    return true;
  }

  return exp * 1000 > Date.now() + 30_000;
}

/**
 * "Hola, Jesús" en vez de "Hola, Usuario 3152" cuando ya tenemos el nombre
 * validado por RENIEC (viene en mayúsculas, ej. "JESUS ALBERTO") — se
 * muestra solo el primer nombre, en formato normal. Las sesiones antiguas
 * pueden no traer este dato desde login; AuthProvider intenta recuperarlo
 * con el DNI y guarda la sesión corregida para no volver al placeholder.
 */
function greetingName(user: AuthUser | null): string {
  const firstToken = user?.firstName?.trim().split(/\s+/)[0];

  if (firstToken) {
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
  }

  return user?.dni ? `Usuario ${user.dni.slice(-4)}` : 'Usuario';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [lastDni, setLastDni] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      const stored = await loadSession();

      if (active && stored) {
        // Hay una sesión guardada, pero no se entra directo: primero hay que
        // confirmar que sigues siendo tú con huella/Face ID o la clave
        // (pantalla de bloqueo), igual que cualquier app de banco real.
        const restoredToken = isTokenUsable(stored.accessToken)
          ? stored.accessToken
          : null;

        setAuthToken(restoredToken);
        setAccessToken(restoredToken);
        setUser(stored.user);
        setLastDni(stored.user.dni);
        setIsLocked(true);
      }

      if (active) {
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const requirePinUnlock = useCallback(() => {
    setIsAuthenticated(false);
    setIsLocked(true);
    setAccessToken(null);
    setAuthToken(null);
    refreshPrivateQueries();
  }, []);

  const signIn = useCallback(
    (session?: StoredSession) => {
      const token = session?.accessToken ?? accessToken;

      if (!isTokenUsable(token)) {
        requirePinUnlock();
        return;
      }

      if (session) {
        setAuthToken(session.accessToken);
        setAccessToken(session.accessToken);
        setUser(session.user);
        setLastDni(session.user.dni);
        void saveSession(session);
      }

      refreshPrivateQueries();
      setIsLocked(false);
      setIsAuthenticated(true);
    },
    [accessToken, requirePinUnlock],
  );

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setIsLocked(false);
    setAccessToken(null);
    setUser(null);
    setAuthToken(null);
    queryClient.clear();
    void clearSession();
  }, []);

  useEffect(() => {
    if (!accessToken || !user?.dni || user.firstName?.trim()) {
      return;
    }

    let active = true;

    void lookupDni(user.dni)
      .then((identity) => {
        if (!active) {
          return;
        }

        const firstName = identityFirstName(identity);
        if (!firstName) {
          return;
        }

        setUser((current) => {
          if (!current || current.id !== user.id || current.firstName?.trim()) {
            return current;
          }

          const next = { ...current, firstName };
          void saveSession({ accessToken, user: next });
          return next;
        });
      })
      .catch(() => {
        // Si RENIEC/proveedor no responde, el login sigue funcionando y se
        // conserva temporalmente "Usuario 1234".
      });

    return () => {
      active = false;
    };
  }, [accessToken, user?.dni, user?.firstName, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      isLocked,
      userName: greetingName(user),
      accessToken,
      user,
      lastDni,
      setLoginDni: (dni) => setLastDni(dni),
      signIn,
      signOut,
      requirePinUnlock,
    }),
    [
      accessToken,
      isAuthenticated,
      isLocked,
      isLoading,
      lastDni,
      requirePinUnlock,
      signIn,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
