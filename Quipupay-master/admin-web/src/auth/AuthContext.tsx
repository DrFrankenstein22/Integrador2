import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  ApiError,
  apiFetch,
  clearAccessToken,
  registerAuthFailureHandler,
  setAccessToken,
} from '../api/client'
import type { AdminIdentity, LoginResponse } from '../api/types'
import { AuthContext, type AuthStatus } from './auth-context'

const ACCESS_TOKEN_STORAGE_KEY = 'quipupay.admin.access-token'

function authMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return 'Tu cuenta no tiene acceso al panel administrativo'
  }
  if (error instanceof ApiError && error.status === 401) {
    return 'El DNI o la clave son incorrectos'
  }
  return error instanceof Error ? error.message : 'No pudimos iniciar sesión'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() =>
    window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
      ? 'authenticating'
      : 'anonymous',
  )
  const [admin, setAdmin] = useState<AdminIdentity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    if (!storedToken) {
      return
    }

    setAccessToken(storedToken)
    void apiFetch<AdminIdentity>('/admin/me')
      .then((identity) => {
        setAdmin(identity)
        setStatus('authenticated')
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
        clearAccessToken()
        setStatus('anonymous')
      })
  }, [])

  useEffect(
    () =>
      registerAuthFailureHandler((failureStatus) => {
        queryClient.clear()
        window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
        setAdmin(null)
        setError(
          failureStatus === 403
            ? 'Tu cuenta ya no tiene acceso al panel administrativo'
            : 'La sesión expiró. Ingresa nuevamente',
        )
        setStatus('anonymous')
      }),
    [queryClient],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    queryClient.clear()
    setAdmin(null)
    setError(null)
    setStatus('anonymous')
  }, [queryClient])

  const login = useCallback(async (dni: string, pin: string) => {
    clearAccessToken()
    queryClient.clear()
    setAdmin(null)
    setError(null)
    setStatus('authenticating')

    try {
      const { accessToken } = await apiFetch<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ dni, password: pin }),
      })
      setAccessToken(accessToken)
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
      const identity = await apiFetch<AdminIdentity>('/admin/me')
      setAdmin(identity)
      setStatus('authenticated')
    } catch (caught) {
      clearAccessToken()
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      setAdmin(null)
      setError(authMessage(caught))
      setStatus('anonymous')
    }
  }, [queryClient])

  const value = useMemo(
    () => ({ status, admin, error, login, logout }),
    [status, admin, error, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
