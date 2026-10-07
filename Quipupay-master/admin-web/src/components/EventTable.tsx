import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AdminActivityEvent } from '../api/types'
import { StatusBadge } from './StatusBadge'

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function EventTable({
  events,
  caption = 'Eventos de auditoría',
}: {
  events: AdminActivityEvent[]
  caption?: string
}) {
  return (
    <div className="table-scroll">
      <table className="event-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Evento</th>
            <th scope="col">Actor</th>
            <th scope="col">Resultado</th>
            <th scope="col">Fecha</th>
            <th scope="col">Correlación</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.source + ':' + event.id}>
              <td data-label="Evento">
                <div className="table-cell-content">
                  <Link className="event-link" to={'/events/' + event.source + '/' + event.id}>
                    <span>{event.description}</span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                  <code>{event.eventType}</code>
                </div>
              </td>
              <td data-label="Actor">
                <div className="table-cell-content">
                  {event.actor ? (
                    <Link className="actor-link" to={'/users/' + event.actor.id + '/activity'}>
                      <span>{event.actor.displayName}</span>
                      <small>DNI {event.actor.maskedDni}</small>
                    </Link>
                  ) : (
                    <span className="muted">Sin actor identificado</span>
                  )}
                </div>
              </td>
              <td data-label="Resultado">
                <div className="table-cell-content">
                  <StatusBadge result={event.result} />
                </div>
              </td>
              <td className="tabular" data-label="Fecha">
                <div className="table-cell-content">
                  <time dateTime={event.createdAt}>{dateFormatter.format(new Date(event.createdAt))}</time>
                </div>
              </td>
              <td className="correlation-cell" data-label="Correlación">
                <div className="table-cell-content">
                  {event.correlationId ? (
                    <code title={event.correlationId}>{event.correlationId.slice(0, 8)}</code>
                  ) : (
                    <span className="muted">No disponible</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
