import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  apiFetch,
  clearAccessToken,
  registerAuthFailureHandler,
  setAccessToken,
} from './client'

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  })

describe('apiFetch', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds the in-memory bearer token without writing browser storage', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'admin-1' }))
    setAccessToken('token-seguro')

    await apiFetch('/admin/me')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-seguro',
        }),
      }),
    )
    expect(storageWrite).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('throws an ApiError with server context for non-success responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { message: 'Filtro inválido', correlationId: 'corr-body' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': 'corr-header',
          },
        },
      ),
    )

    await expect(apiFetch('/admin/audit/events')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        status: 400,
        message: 'Filtro inválido',
        correlationId: 'corr-header',
      }),
    )
  })

  it('does not let a stale 401 invalidate a newer session with the same token text', async () => {
    let resolveOldRequest!: (response: Response) => void
    const authFailure = vi.fn()
    const unregister = registerAuthFailureHandler(authFailure)
    vi.mocked(fetch)
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveOldRequest = resolve }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'admin-2' }))

    setAccessToken('same-token')
    const oldRequest = apiFetch('/admin/audit/events').catch(() => undefined)
    setAccessToken('same-token')
    resolveOldRequest(jsonResponse({ message: 'Unauthorized' }, { status: 401 }))
    await oldRequest
    await apiFetch('/admin/me')

    expect(authFailure).not.toHaveBeenCalled()
    const newerRequest = vi.mocked(fetch).mock.calls[1][1]
    expect(new Headers(newerRequest?.headers).get('Authorization')).toBe(
      'Bearer same-token',
    )
    unregister()
  })
})
