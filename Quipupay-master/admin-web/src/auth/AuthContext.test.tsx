import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '../api/client'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function AuthProbe() {
  const { admin, error, login, logout, status } = useAuth()

  return (
    <div>
      <p>Estado: {status}</p>
      <p>Administrador: {admin?.displayName ?? 'ninguno'}</p>
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={() => void login('12345678', '135790')}>
        Ingresar
      </button>
      <button type="button" onClick={logout}>
        Salir
      </button>
      <button type="button" onClick={() => void apiFetch('/admin/probe').catch(() => undefined)}>
        Consultar área administrativa
      </button>
    </div>
  )
}

function renderAuthProbe() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return queryClient
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates a successful login with /admin/me and persists the token', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token-admin' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'admin-1',
          displayName: 'Ada Lovelace',
          maskedDni: '••••5678',
          roles: ['AUDITOR'],
          permissions: ['audit:read'],
        }),
      )

    renderAuthProbe()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Estado: authenticated')).toBeInTheDocument()
    expect(screen.getByText('Administrador: Ada Lovelace')).toBeInTheDocument()
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dni: '12345678', password: '135790' }),
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/admin/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-admin' }),
      }),
    )
    expect(storageWrite).toHaveBeenCalledWith('quipupay.admin.access-token', 'token-admin')
  })

  it('restores a persisted session after loading', async () => {
    window.localStorage.setItem('quipupay.admin.access-token', 'stored-token')
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        id: 'admin-1',
        displayName: 'Ada Lovelace',
        maskedDni: '••••5678',
        roles: ['AUDITOR'],
        permissions: ['audit:read'],
      }),
    )

    renderAuthProbe()

    expect(await screen.findByText('Estado: authenticated')).toBeInTheDocument()
    expect(screen.getByText('Administrador: Ada Lovelace')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer stored-token' }),
      }),
    )
  })

  it('clears a denied session and explains missing administrative access', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token-user' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    renderAuthProbe()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta no tiene acceso al panel administrativo',
    )
    expect(screen.getByText('Estado: anonymous')).toBeInTheDocument()

    await apiFetch('/probe')
    const probeInit = vi.mocked(fetch).mock.calls[2][1]
    expect(new Headers(probeInit?.headers).has('Authorization')).toBe(false)
  })

  it('logs out and clears the active administrator', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token-admin' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'admin-1',
          displayName: 'Ada Lovelace',
          maskedDni: '••••5678',
          roles: ['AUDITOR'],
          permissions: ['audit:read'],
        }),
      )

    const queryClient = renderAuthProbe()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await screen.findByText('Estado: authenticated')
    queryClient.setQueryData(['audit-summary'], { totalEvents: 42 })
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))

    await waitFor(() => {
      expect(screen.getByText('Estado: anonymous')).toBeInTheDocument()
    })
    expect(screen.getByText('Administrador: ninguno')).toBeInTheDocument()
    expect(queryClient.getQueryData(['audit-summary'])).toBeUndefined()
  })

  it('invalidates an active in-memory session after an administrative 401', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token-admin' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'admin-1',
          displayName: 'Ada Lovelace',
          maskedDni: '••••5678',
          roles: ['ADMIN'],
          permissions: ['audit:read'],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const queryClient = renderAuthProbe()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await screen.findByText('Estado: authenticated')
    queryClient.setQueryData(['audit-events'], { items: ['sesión anterior'] })
    await userEvent.click(
      screen.getByRole('button', { name: 'Consultar área administrativa' }),
    )

    expect(await screen.findByText('Estado: anonymous')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La sesión expiró')
    expect(queryClient.getQueryData(['audit-events'])).toBeUndefined()

    await apiFetch('/probe')
    const probeInit = vi.mocked(fetch).mock.calls[3][1]
    expect(new Headers(probeInit?.headers).has('Authorization')).toBe(false)
  })
})
