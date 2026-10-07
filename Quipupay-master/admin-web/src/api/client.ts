const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/$/,
  '',
)

let accessToken: string | null = null
let authGeneration = 0
let authFailureHandler: ((status: 401 | 403) => void) | null = null

type ErrorPayload = {
  message?: string | string[]
  correlationId?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly correlationId: string | null

  constructor(status: number, message: string, correlationId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.correlationId = correlationId
  }
}

export function setAccessToken(token: string) {
  authGeneration += 1
  accessToken = token
}

export function clearAccessToken() {
  authGeneration += 1
  accessToken = null
}

export function registerAuthFailureHandler(handler: (status: 401 | 403) => void) {
  authFailureHandler = handler
  return () => {
    if (authFailureHandler === handler) authFailureHandler = null
  }
}

function requestHeaders(init: RequestInit) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value
  })

  if (init.body && !headers['content-type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = 'Bearer ' + accessToken
  }

  return headers
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined
  return response.json()
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestAccessToken = accessToken
  const requestAuthGeneration = authGeneration
  const response = await fetch(API_URL + path, {
    ...init,
    headers: requestHeaders(init),
  })
  const payload = await responsePayload(response)

  if (!response.ok) {
    if (
      requestAccessToken !== null &&
      authGeneration === requestAuthGeneration &&
      path.startsWith('/admin/') &&
      (response.status === 401 || response.status === 403)
    ) {
      clearAccessToken()
      authFailureHandler?.(response.status)
    }
    const error = (payload ?? {}) as ErrorPayload
    const message = Array.isArray(error.message)
      ? error.message.join('. ')
      : (error.message ?? 'No se pudo completar la solicitud')
    throw new ApiError(
      response.status,
      message,
      response.headers.get('x-correlation-id') ?? error.correlationId ?? null,
    )
  }

  return payload as T
}
