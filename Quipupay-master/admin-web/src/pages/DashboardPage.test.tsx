import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as auditApi from '../api/audit-api'
import { ApiError } from '../api/client'
import type { AdminActivityEvent } from '../api/types'
import { renderPage } from '../test/render'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/audit-api')

const event: AdminActivityEvent = {
  source: 'audit',
  id: 'event-1',
  eventType: 'ACCOUNT_OPENED',
  title: 'Cuenta abierta',
  description: 'El usuario abrió una cuenta Ahorro en PEN.',
  result: 'SUCCESS',
  actor: {
    id: 'user-1',
    displayName: 'Carlos Mendoza',
    maskedDni: '••••5678',
  },
  entity: { type: 'account', id: 'account-1' },
  correlationId: '8f92a120-4417-412d-9cb8-7f26b66b0110',
  ipAddress: '10.0.0.5',
  userAgent: 'Mozilla/5.0',
  metadata: { productCode: 'AHORRO', currency: 'PEN' },
  createdAt: '2026-09-09T19:32:01.000Z',
}

function renderDashboard() {
  return renderPage(
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/events/:source/:id" element={<p>Detalle abierto</p>} />
      <Route path="/users/:id/activity" element={<p>Historial abierto</p>} />
      <Route path="/events" element={<p>Explorador abierto</p>} />
    </Routes>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(auditApi.getAuditSummary).mockResolvedValue({
      totalEvents: 1284,
      successfulEvents: 1197,
      failedEvents: 87,
      activeUsers: 342,
      from: '2026-08-10',
      to: '2026-09-09',
    })
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue({
      items: [event],
      nextCursor: null,
    })
  })

  it('shows the four metrics and makes recent events and actors navigable', async () => {
    renderDashboard()

    expect(await screen.findByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('1,197')).toBeInTheDocument()
    expect(screen.getByText('87')).toBeInTheDocument()
    expect(screen.getByText('342')).toBeInTheDocument()
    expect(screen.getByText(event.description)).toBeInTheDocument()
    expect(screen.getByText('ACCOUNT_OPENED')).toBeInTheDocument()
    expect(screen.getByText('DNI ••••5678')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /Carlos Mendoza/ }))
    expect(screen.getByText('Historial abierto')).toBeInTheDocument()
  })

  it('shows a retryable error with the server correlation identifier', async () => {
    vi.mocked(auditApi.getAuditEvents)
      .mockRejectedValueOnce(
        new ApiError(500, 'No disponible', 'corr-123'),
      )
      .mockResolvedValueOnce({ items: [event], nextCursor: null })
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('corr-123')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(event.description)).toBeInTheDocument()
  })

  it('explains an empty result instead of rendering an empty table', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue({
      items: [],
      nextCursor: null,
    })
    renderDashboard()

    expect(
      await screen.findByText('Sin actividad en el rango'),
    ).toBeInTheDocument()
  })
})
