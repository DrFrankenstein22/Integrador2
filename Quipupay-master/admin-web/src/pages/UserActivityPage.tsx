import { useInfiniteQuery } from '@tanstack/react-query'
import { Activity, ArrowLeft, Clock3, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

import {
  getUserActivity,
  type AuditFilters as AuditFilterValues,
} from '../api/audit-api'
import { ApiError } from '../api/client'
import type { ActivitySource, AdminActivityEvent } from '../api/types'
import { AsyncStatePlaceholder, EmptyState, ErrorState, LoadingState, NotFoundState } from '../components/AsyncState'
import { AuditFilters } from '../components/AuditFilters'
import { StatusBadge, UserStatusBadge } from '../components/StatusBadge'

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function filtersFromParams(params: URLSearchParams): AuditFilterValues {
  return {
    source: (params.get('source') || undefined) as ActivitySource | undefined,
    eventType: params.get('eventType') || undefined,
    result: params.get('result') || undefined,
    correlationId: params.get('correlationId') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    limit: 25,
  }
}

function newestFirst(events: AdminActivityEvent[]) {
  return [...events].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )
}

export function UserActivityPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const query = useInfiniteQuery({
    queryKey: ['user-activity', id, filters],
    queryFn: ({ pageParam }) => getUserActivity(id, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.activity.nextCursor ?? undefined,
    enabled: Boolean(id),
  })
  const events = newestFirst(
    query.data?.pages.flatMap((page) => page.activity.items) ?? [],
  )
  const user = query.data?.pages[0]?.user

  const applyFilters = (next: AuditFilterValues) => {
    const nextParams = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (key !== 'limit' && value) nextParams.set(key, String(value))
    })
    setParams(nextParams)
  }

  if (!id) {
    return (
      <div className="page-content">
        <p role="alert">El usuario solicitado no es válido.</p>
        <Link to="/users">Volver a usuarios</Link>
      </div>
    )
  }
  if (query.isPending) return <LoadingState label="Cargando historial" />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <NotFoundState
          title="Usuario no encontrado"
          description="La identidad no existe o ya no está disponible para auditoría."
          to="/users"
          linkLabel="Volver a usuarios"
        />
      )
    }
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  }
  if (!user) {
    return <AsyncStatePlaceholder />
  }

  const returnTarget = location.pathname + location.search

  return (
    <>
      <header className="page-header user-activity-header">
        <div>
          <Link className="back-link" to="/users">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a usuarios
          </Link>
          <p className="eyebrow">Historial individual</p>
          <div className="page-title-row">
            <h1>{user.displayName}</h1>
            <p className="technical-id user-dni-heading">DNI {user.maskedDni}</p>
          </div>
        </div>
        <button
          type="button"
          className="button-secondary refresh-button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Actualizar historial
        </button>
      </header>
      <div className="page-content">
        <section className="user-summary" aria-label="Resumen del usuario">
          <div><ShieldCheck size={17} aria-hidden="true" /><span><small>Estado</small><UserStatusBadge status={user.status} /></span></div>
          <div><Activity size={17} aria-hidden="true" /><span><small>Volumen registrado</small>{user.eventCount} eventos</span></div>
          <div><Clock3 size={17} aria-hidden="true" /><span><small>Última actividad</small><span className="tabular">{user.lastActivityAt ? dateFormatter.format(new Date(user.lastActivityAt)) : 'Sin actividad'}</span></span></div>
          <div><MapPin size={17} aria-hidden="true" /><span><small>IP reciente</small><code>{user.recentIpAddress ?? 'No disponible'}</code></span></div>
        </section>

        <AuditFilters key={params.toString()} filters={filters} onApply={applyFilters} />

        <section className="ledger-section">
          <div className="section-heading">
            <h2>Línea de tiempo</h2>
          </div>
          {events.length === 0 ? (
            <EmptyState
              title="Este usuario aún no tiene actividad"
              description="Ajusta los filtros o vuelve más tarde para consultar nuevos registros."
            />
          ) : (
            <>
              <ol className="activity-timeline" aria-label="Actividad del usuario">
                {events.map((event) => (
                  <li key={event.source + ':' + event.id}>
                    <Link
                      to={'/events/' + event.source + '/' + event.id}
                      state={{ from: returnTarget }}
                    >
                      <span className="timeline-copy">
                        <strong>{event.description}</strong>
                        <code>
                          <span>{event.eventType}</span>
                          {' · IP '}
                          <span>{event.ipAddress ?? 'No disponible'}</span>
                          {' · '}
                          <span>{event.correlationId ?? 'Sin correlación'}</span>
                        </code>
                      </span>
                      <span className="timeline-meta">
                        <StatusBadge result={event.result} />
                        <time dateTime={event.createdAt}>{dateFormatter.format(new Date(event.createdAt))}</time>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {query.hasNextPage ? (
                <div className="load-more">
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                  >
                    {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más actividad'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  )
}
