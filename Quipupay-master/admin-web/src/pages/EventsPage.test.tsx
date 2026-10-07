import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as auditApi from '../api/audit-api'
import type { AdminActivityEvent } from '../api/types'
import { renderPage } from '../test/render'
import { EventsPage } from './EventsPage'

vi.mock('../api/audit-api')

const firstEvent: AdminActivityEvent = {
  source: 'login',
  id: 'login-1',
  eventType: 'LOGIN_FAILED',
  title: 'Inicio de sesión rechazado',
  description: 'El intento de inicio de sesión fue rechazado por PIN_INVALIDO.',
  result: 'FAILURE',
  actor: { id: 'user-2', displayName: 'Ana Soto', maskedDni: '••••8941' },
  entity: null,
  correlationId: null,
  ipAddress: '192.0.2.1',
  userAgent: 'Quipupay Mobile',
  metadata: { reason: 'PIN_INVALIDO' },
  createdAt: '2026-09-09T18:15:44.000Z',
}

const secondEvent: AdminActivityEvent = {
  ...firstEvent,
  source: 'audit',
  id: 'audit-2',
  eventType: 'USER_REGISTERED',
  title: 'Registro completado',
  description: 'El usuario completó su registro.',
  result: 'SUCCESS',
  correlationId: 'corr-2',
  createdAt: '2026-09-09T17:45:00.000Z',
}

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="ubicacion">{location.pathname + location.search}</output>
}

function renderEvents(initialEntry = '/events') {
  return renderPage(
    <>
      <Routes>
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:source/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <LocationProbe />
    </>,
    [initialEntry],
  )
}

describe('EventsPage', () => {
  beforeEach(() => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue({
      items: [firstEvent],
      nextCursor: null,
    })
  })

  it('presents the human description first and keeps the technical code visible', async () => {
    renderEvents('/events?eventType=LOGIN_FAILED')

    const table = await screen.findByRole('table', { name: 'Eventos de auditoría' })
    const row = within(table).getAllByRole('row')[1]
    const cells = within(row).getAllByRole('cell')
    const text = row.textContent ?? ''
    expect(text.indexOf(firstEvent.description)).toBeLessThan(text.indexOf('LOGIN_FAILED'))
    expect(within(row).getByText('Fallo')).toBeInTheDocument()
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual([
      'Evento',
      'Actor',
      'Resultado',
      'Fecha',
      'Correlación',
    ])
  })

  it('reflects filters in the URL without losing existing state', async () => {
    renderEvents('/events?eventType=LOGIN_FAILED')
    await screen.findByText(firstEvent.description)

    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'SUCCESS')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(screen.getByLabelText('ubicacion')).toHaveTextContent(
      '/events?eventType=LOGIN_FAILED&result=SUCCESS',
    )
  })

  it('loads the next cursor and appends events', async () => {
    vi.mocked(auditApi.getAuditEvents)
      .mockResolvedValueOnce({ items: [firstEvent], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ items: [secondEvent], nextCursor: null })
    renderEvents()

    expect(await screen.findByText(firstEvent.description)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más eventos' }))
    expect(await screen.findByText(secondEvent.description)).toBeInTheDocument()
  })
})
