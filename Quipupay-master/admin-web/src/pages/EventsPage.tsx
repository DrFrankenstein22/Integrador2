import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { getAuditEvents, type AuditFilters as AuditFilterValues } from '../api/audit-api'
import { AuditFilters } from '../components/AuditFilters'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'
import { EventTable } from '../components/EventTable'
import type { ActivitySource } from '../api/types'

function filtersFromParams(params: URLSearchParams): AuditFilterValues {
  return {
    source: (params.get('source') || undefined) as ActivitySource | undefined,
    eventType: params.get('eventType') || undefined,
    result: params.get('result') || undefined,
    actorUserId: params.get('actorUserId') || undefined,
    correlationId: params.get('correlationId') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    limit: 25,
  }
}

export function EventsPage() {
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const query = useInfiniteQuery({
    queryKey: ['audit-events', params.toString()],
    queryFn: ({ pageParam }) => getAuditEvents(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const events = query.data?.pages.flatMap((page) => page.items) ?? []

  const applyFilters = (next: AuditFilterValues) => {
    const nextParams = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (key !== 'limit' && value) nextParams.set(key, String(value))
    })
    setParams(nextParams)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Registro unificado</p>
          <h1>Explorador de eventos</h1>
          <p>Filtra actividad funcional e intentos de acceso sin perder el contexto técnico.</p>
        </div>
      </header>
      <div className="page-content">
        <AuditFilters
          key={params.toString()}
          filters={filters}
          onApply={applyFilters}
        />
        <p className="result-count">{events.length} eventos cargados</p>
        <section className="ledger-section">
          {query.isPending ? (
            <LoadingState label="Buscando eventos" />
          ) : query.isError ? (
            <ErrorState error={query.error} retry={() => void query.refetch()} />
          ) : events.length === 0 ? (
            <EmptyState
              title="No encontramos eventos"
              description="Prueba con menos filtros o con un rango de fechas más amplio."
            />
          ) : (
            <>
              <EventTable events={events} />
              {query.hasNextPage ? (
                <div className="load-more">
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                  >
                    {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más eventos'}
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
