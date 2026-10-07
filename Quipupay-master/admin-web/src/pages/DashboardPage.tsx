import { Activity, CircleCheck, CircleX, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'

import {
  getAuditEvents,
  getAuditSummary,
  type AuditFilters as AuditFilterValues,
} from '../api/audit-api'
import { AuditFilters } from '../components/AuditFilters'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'
import { EventTable } from '../components/EventTable'
import { MetricCard } from '../components/MetricCard'

export function DashboardPage() {
  const [filters, setFilters] = useState<AuditFilterValues>({})
  const summary = useQuery({
    queryKey: ['audit-summary', filters.from, filters.to],
    queryFn: () => getAuditSummary(filters),
  })
  const recent = useQuery({
    queryKey: ['audit-events', { ...filters, limit: 8 }],
    queryFn: () => getAuditEvents({ ...filters, limit: 8 }),
  })

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Vista operacional</p>
          <h1>Resumen de auditoría</h1>
          <p>Actividad funcional y accesos registrados por Quipupay.</p>
        </div>
        <AuditFilters compact filters={filters} onApply={setFilters} />
      </header>
      <div className="page-content">
        {summary.isPending ? (
          <div className="ledger-section">
            <LoadingState label="Cargando métricas" />
          </div>
        ) : summary.isError ? (
          <div className="ledger-section">
            <ErrorState error={summary.error} retry={() => void summary.refetch()} />
          </div>
        ) : (
          <section className="metric-rail" aria-label="Resumen de actividad">
            <MetricCard label="Eventos totales" value={summary.data.totalEvents} icon={Activity} />
            <MetricCard
              label="Exitosos"
              value={summary.data.successfulEvents}
              icon={CircleCheck}
              tone="success"
            />
            <MetricCard
              label="Fallidos"
              value={summary.data.failedEvents}
              icon={CircleX}
              tone="danger"
            />
            <MetricCard label="Usuarios activos" value={summary.data.activeUsers} icon={Users} />
          </section>
        )}

        <section className="ledger-section">
          <div className="section-heading">
            <h2>Actividad reciente</h2>
            <Link to="/events">Ver todos los eventos</Link>
          </div>
          {recent.isPending ? (
            <LoadingState label="Cargando actividad reciente" />
          ) : recent.isError ? (
            <ErrorState error={recent.error} retry={() => void recent.refetch()} />
          ) : recent.data.items.length === 0 ? (
            <EmptyState
              title="Sin actividad en el rango"
              description="Ajusta las fechas del filtro para revisar otros eventos."
            />
          ) : (
            <EventTable events={recent.data.items} caption="Actividad reciente" />
          )}
        </section>
      </div>
    </>
  )
}
