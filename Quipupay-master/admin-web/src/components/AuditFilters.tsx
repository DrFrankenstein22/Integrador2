import { useState, type FormEvent } from 'react'

import type { AuditFilters as AuditFilterValues } from '../api/audit-api'

type Props = {
  filters: AuditFilterValues
  onApply: (filters: AuditFilterValues) => void
  compact?: boolean
}

export function AuditFilters({ filters, onApply, compact = false }: Props) {
  const [draft, setDraft] = useState(filters)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onApply(draft)
  }

  return (
    <form className={'filter-bar' + (compact ? ' filter-bar-compact' : '')} onSubmit={submit}>
      {!compact ? (
        <>
          <label className="filter-source">
            Fuente
            <select
              value={draft.source ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, source: (event.target.value || undefined) as AuditFilterValues['source'] })
              }
            >
              <option value="">Todas</option>
              <option value="audit">Eventos</option>
              <option value="login">Accesos</option>
            </select>
          </label>
          <label className="filter-event-type">
            Código de evento
            <input
              value={draft.eventType ?? ''}
              placeholder="Ej. LOGIN_FAILED"
              onChange={(event) => setDraft({ ...draft, eventType: event.target.value })}
            />
          </label>
          <label className="filter-result">
            Resultado
            <select
              value={draft.result ?? ''}
              onChange={(event) => setDraft({ ...draft, result: event.target.value || undefined })}
            >
              <option value="">Todos</option>
              <option value="SUCCESS">Éxito</option>
              <option value="FAILURE">Fallo</option>
            </select>
          </label>
        </>
      ) : null}
      <label className="filter-from">
        Desde
        <input
          type="date"
          value={draft.from ?? ''}
          onChange={(event) => setDraft({ ...draft, from: event.target.value || undefined })}
        />
      </label>
      <label className="filter-to">
        Hasta
        <input
          type="date"
          value={draft.to ?? ''}
          onChange={(event) => setDraft({ ...draft, to: event.target.value || undefined })}
        />
      </label>
      {!compact ? (
        <label className="filter-correlation">
          Correlación
          <input
            value={draft.correlationId ?? ''}
            placeholder="ID de correlación"
            onChange={(event) => setDraft({ ...draft, correlationId: event.target.value })}
          />
        </label>
      ) : null}
      <button className="button-primary" type="submit">
        Aplicar filtros
      </button>
    </form>
  )
}
