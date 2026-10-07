import { afterEach, expect, it, vi } from 'vitest'

import { clearAccessToken } from './client'
import { getAuditEvents, getAuditSummary } from './audit-api'

afterEach(() => {
  clearAccessToken()
  vi.unstubAllGlobals()
})

it.each([
  ['events', () => getAuditEvents({ from: '2026-09-09', to: '2026-09-09' })],
  ['summary', () => getAuditSummary({ from: '2026-09-09', to: '2026-09-09' })],
])('sends an inclusive Lima calendar day to audit %s', async (_name, request) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )

  await request()

  const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
  expect(calledUrl.searchParams.get('from')).toBe('2026-09-09T05:00:00.000Z')
  expect(calledUrl.searchParams.get('to')).toBe('2026-09-10T04:59:59.999Z')
})

it('leaves an impossible URL date unchanged for backend validation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], nextCursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )

  await getAuditEvents({ from: '2026-02-31' })

  const calledUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
  expect(calledUrl.searchParams.get('from')).toBe('2026-02-31')
})
