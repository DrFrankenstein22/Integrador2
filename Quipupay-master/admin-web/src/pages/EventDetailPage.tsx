import { ArrowLeft, Copy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'

import { getAuditEvent } from '../api/audit-api'
import { ApiError } from '../api/client'
import type { ActivitySource } from '../api/types'
import { ErrorState, LoadingState, NotFoundState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function EventDetailPage() {
  const { source, id } = useParams()
  const location = useLocation()
  const requestedReturn = (location.state as { from?: string } | null)?.from
  const returnsToUser = Boolean(
    requestedReturn?.match(/^\/users\/[^/]+\/activity(?:\?|$)/),
  )
  const returnTarget = returnsToUser ? requestedReturn! : '/events'
  const returnLabel = returnsToUser ? 'Volver al historial' : 'Volver a eventos'
  const validSource = source === 'audit' || source === 'login'
  const query = useQuery({
    queryKey: ['audit-event', source, id],
    queryFn: () => getAuditEvent(source as ActivitySource, id ?? ''),
    enabled: validSource && Boolean(id),
  })

  if (!validSource || !id) {
    return (
      <div className="page-content">
        <p role="alert">El evento solicitado no es válido.</p>
        <Link to={returnTarget}>{returnLabel}</Link>
      </div>
    )
  }
  if (query.isPending) return <LoadingState label="Cargando detalle del evento" />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <NotFoundState
          title="Evento no encontrado"
          description="El registro no existe o el enlace no es válido."
          to={returnTarget}
          linkLabel={returnLabel}
        />
      )
    }
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  }

  const event = query.data
  const copyCorrelation = () => {
    if (event.correlationId && navigator.clipboard) {
      void navigator.clipboard.writeText(event.correlationId)
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" to={returnTarget}>
            <ArrowLeft size={16} aria-hidden="true" />
            {returnLabel}
          </Link>
          <p className="eyebrow">Evidencia de auditoría</p>
          <div className="page-title-row">
            <h1>{event.title}</h1>
            <StatusBadge result={event.result} size="lg" />
          </div>
          <p>{event.description}</p>
        </div>
      </header>
      <div className="page-content page-content-narrow">
        <section className="evidence-card">
          <h2>Datos del evento</h2>
          <dl className="evidence-grid">
            <div><dt>Código técnico</dt><dd><code>{event.eventType}</code></dd></div>
            <div><dt>Fuente</dt><dd>{event.source === 'audit' ? 'Eventos funcionales' : 'Intentos de acceso'}</dd></div>
            <div><dt>Fecha y hora</dt><dd className="tabular"><time dateTime={event.createdAt}>{dateFormatter.format(new Date(event.createdAt))}</time></dd></div>
            <div><dt>Actor</dt><dd>{event.actor ? <Link to={'/users/' + event.actor.id + '/activity'}>{event.actor.displayName} · DNI {event.actor.maskedDni}</Link> : 'Sin actor identificado'}</dd></div>
            <div><dt>Dirección IP</dt><dd><code>{event.ipAddress ?? 'No disponible'}</code></dd></div>
            <div>
              <dt>Correlación</dt>
              <dd className="correlation-value">
                <code>{event.correlationId ?? 'No disponible'}</code>
                {event.correlationId ? <button type="button" aria-label="Copiar correlación" onClick={copyCorrelation}><Copy size={14} aria-hidden="true" /></button> : null}
              </dd>
            </div>
          </dl>
        </section>
        <section className="evidence-card">
          <h2>Metadata</h2>
          {Object.keys(event.metadata).length ? (
            <dl className="metadata-list">
              {Object.entries(event.metadata).map(([key, value]) => (
                <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="muted metadata-empty">Este evento no contiene metadata adicional.</p>
          )}
        </section>
      </div>
    </>
  )
}
