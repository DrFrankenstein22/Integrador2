import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as auditApi from '../api/audit-api'
import { ApiError } from '../api/client'
import type { AdminActivityEvent, AdminUserSummary } from '../api/types'
import { renderPage } from '../test/render'
import { UserActivityPage } from './UserActivityPage'
import { UsersPage } from './UsersPage'
import { EventDetailPage } from './EventDetailPage'

vi.mock('../api/audit-api')

const user: AdminUserSummary = {
  id: '62c8dcf8-a427-43ce-b7bf-4583de77e865',
  displayName: 'Lucía Mendoza',
  maskedDni: '••••5821',
  status: 'ACTIVE',
  lastActivityAt: '2026-09-09T19:32:01.000Z',
}

const newerEvent: AdminActivityEvent = {
  source: 'audit',
  id: '15d2eb57-5cd8-4e72-a07a-2f74bf068cd9',
  eventType: 'ACCOUNT_OPENED',
  title: 'Cuenta abierta',
  description: 'Apertura de cuenta de ahorro en soles',
  result: 'SUCCESS',
  actor: { id: user.id, displayName: user.displayName, maskedDni: user.maskedDni },
  entity: { type: 'account', id: 'account-1' },
  correlationId: '7b443b96-7b89-42d2-9e47-8658a7f4d389',
  ipAddress: '192.0.2.14',
  userAgent: 'Quipupay Mobile',
  metadata: { currency: 'PEN' },
  createdAt: '2026-09-09T19:32:01.000Z',
}

const olderEvent: AdminActivityEvent = {
  ...newerEvent,
  source: 'login',
  id: '94547385-6d7c-41d1-8a99-f089dd7e357b',
  eventType: 'LOGIN_SUCCESS',
  title: 'Inicio de sesión',
  description: 'Inicio de sesión completado',
  createdAt: '2026-09-08T14:00:00.000Z',
}

const userActivity = {
  user: {
    ...user,
    recentIpAddress: '192.0.2.14',
    eventCount: 12,
  },
  activity: {
    items: [olderEvent, newerEvent],
    nextCursor: null,
  },
}

function LocationStateProbe() {
  const location = useLocation()
  return (
    <output aria-label="destino">
      {location.pathname}|{String((location.state as { from?: string } | null)?.from ?? '')}
    </output>
  )
}

function renderUsers() {
  return renderPage(
    <Routes>
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:id/activity" element={<p>Historial abierto</p>} />
    </Routes>,
    ['/users'],
  )
}

function renderActivity(initialEntry = `/users/${user.id}/activity`) {
  return renderPage(
    <>
      <Routes>
        <Route path="/users/:id/activity" element={<UserActivityPage />} />
        <Route path="/events/:source/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <LocationStateProbe />
    </>,
    [initialEntry],
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(auditApi.getUsers).mockResolvedValue({ items: [user], nextCursor: null })
  })

  it('searches on the server after a debounce and links only masked identities', async () => {
    renderUsers()
    expect(await screen.findByText(user.displayName)).toBeInTheDocument()
    expect(screen.getByText('DNI ' + user.maskedDni)).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), 'Lucía')
    await waitFor(
      () => expect(auditApi.getUsers).toHaveBeenLastCalledWith('Lucía', undefined),
      { timeout: 1000 },
    )

    await userEvent.click(screen.getByRole('link', { name: /Lucía Mendoza/ }))
    expect(screen.getByText('Historial abierto')).toBeInTheDocument()
  })

  it('shows retryable failures and empty results', async () => {
    vi.mocked(auditApi.getUsers)
      .mockRejectedValueOnce(new ApiError(500, 'No disponible', 'users-corr'))
      .mockResolvedValueOnce({ items: [], nextCursor: null })
    renderUsers()

    expect(await screen.findByRole('alert')).toHaveTextContent('users-corr')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No encontramos usuarios')).toBeInTheDocument()
  })
})

describe('UserActivityPage', () => {
  beforeEach(() => {
    vi.mocked(auditApi.getUserActivity).mockResolvedValue(userActivity)
  })

  it('shows the masked user summary and a newest-first operational timeline', async () => {
    renderActivity()

    expect(await screen.findByRole('heading', { name: user.displayName })).toBeInTheDocument()
    expect(screen.getByText('DNI ' + user.maskedDni)).toBeInTheDocument()
    expect(screen.getByText('12 eventos')).toBeInTheDocument()
    expect(screen.getByText('ACCOUNT_OPENED')).toBeInTheDocument()
    expect(screen.getByText('Apertura de cuenta de ahorro en soles')).toBeInTheDocument()

    const timeline = screen.getByRole('list', { name: 'Actividad del usuario' })
    const entries = within(timeline).getAllByRole('listitem')
    expect(entries[0]).toHaveTextContent('ACCOUNT_OPENED')
    expect(within(entries[0]).getByText('192.0.2.14')).toBeInTheDocument()
    expect(
      within(entries[0]).getByText('7b443b96-7b89-42d2-9e47-8658a7f4d389'),
    ).toBeInTheDocument()
    expect(entries[1]).toHaveTextContent('LOGIN_SUCCESS')
  })

  it('applies filters and preserves the timeline as the detail return target', async () => {
    renderActivity()
    await screen.findByText('Apertura de cuenta de ahorro en soles')

    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'SUCCESS')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() =>
      expect(auditApi.getUserActivity).toHaveBeenLastCalledWith(
        user.id,
        expect.objectContaining({ result: 'SUCCESS', limit: 25 }),
        undefined,
      ),
    )

    await userEvent.click(
      screen.getByRole('link', { name: /Apertura de cuenta de ahorro en soles/ }),
    )
    expect(screen.getByText('Detalle abierto')).toBeInTheDocument()
    expect(screen.getByLabelText('destino')).toHaveTextContent(
      `/events/audit/${newerEvent.id}|/users/${user.id}/activity?result=SUCCESS`,
    )
  })

  it('appends the next cursor page', async () => {
    vi.mocked(auditApi.getUserActivity)
      .mockResolvedValueOnce({
        ...userActivity,
        activity: { items: [newerEvent], nextCursor: 'cursor-2' },
      })
      .mockResolvedValueOnce({
        ...userActivity,
        activity: { items: [olderEvent], nextCursor: null },
      })
    renderActivity()

    expect(await screen.findByText(newerEvent.description)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más actividad' }))
    expect(await screen.findByText(olderEvent.description)).toBeInTheDocument()
    expect(auditApi.getUserActivity).toHaveBeenLastCalledWith(
      user.id,
      expect.objectContaining({ limit: 25 }),
      'cursor-2',
    )
  })

  it('exposes loading, retryable error, and empty activity states', async () => {
    let resolveRequest!: (value: typeof userActivity) => void
    vi.mocked(auditApi.getUserActivity)
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveRequest = resolve }),
      )
      .mockRejectedValueOnce(new ApiError(500, 'No disponible', 'activity-corr'))
      .mockResolvedValueOnce({
        ...userActivity,
        activity: { items: [], nextCursor: null },
      })
    renderActivity()

    expect(screen.getByText(/Cargando historial/)).toBeInTheDocument()
    resolveRequest(userActivity)
    expect(await screen.findByText(newerEvent.description)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar historial' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('activity-corr')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Este usuario aún no tiene actividad')).toBeInTheDocument()
  })

  it('explains a missing user and links back to the directory', async () => {
    vi.mocked(auditApi.getUserActivity).mockRejectedValue(
      new ApiError(404, 'El usuario no existe'),
    )
    renderActivity()

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a usuarios' })).toHaveAttribute(
      'href',
      '/users',
    )
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})

describe('EventDetailPage return context', () => {
  it('returns to the originating filtered user timeline', async () => {
    vi.mocked(auditApi.getAuditEvent).mockResolvedValue(newerEvent)
    const from = `/users/${user.id}/activity?result=SUCCESS`
    renderPage(
      <Routes>
        <Route path="/events/:source/:id" element={<EventDetailPage />} />
      </Routes>,
      [{ pathname: `/events/audit/${newerEvent.id}`, state: { from } }],
    )

    await screen.findByRole('heading', { name: newerEvent.title })
    expect(screen.getByRole('link', { name: 'Volver al historial' })).toHaveAttribute(
      'href',
      from,
    )
  })

  it('explains a missing event and links back to the explorer', async () => {
    vi.mocked(auditApi.getAuditEvent).mockRejectedValue(
      new ApiError(404, 'El evento no existe'),
    )
    renderPage(
      <Routes>
        <Route path="/events/:source/:id" element={<EventDetailPage />} />
      </Routes>,
      [`/events/audit/${newerEvent.id}`],
    )

    expect(await screen.findByText('Evento no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a eventos' })).toHaveAttribute(
      'href',
      '/events',
    )
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})
