import { AlertTriangle, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ApiError } from '../api/client'

export function LoadingState({ label = 'Cargando información' }: { label?: string }) {
  return (
    <div className="async-state" role="status">
      <span className="skeleton-stack" aria-hidden="true">
        <span className="skeleton-line" />
        <span className="skeleton-line" />
        <span className="skeleton-line" />
      </span>
      <span>{label}…</span>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="async-state">
      <Inbox size={28} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

export function AsyncStatePlaceholder() {
  return (
    <EmptyState
      title="No pudimos mostrar este historial"
      description="Vuelve al directorio de usuarios e intenta nuevamente."
    />
  )
}

export function NotFoundState({
  title,
  description,
  to,
  linkLabel,
}: {
  title: string
  description: string
  to: string
  linkLabel: string
}) {
  return (
    <div className="async-state">
      <Inbox size={28} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      <Link className="button-secondary state-link" to={to}>{linkLabel}</Link>
    </div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  const apiError = error instanceof ApiError ? error : null
  const message = error instanceof Error ? error.message : 'No pudimos cargar la información'
  return (
    <div className="async-state async-error" role="alert">
      <AlertTriangle size={28} aria-hidden="true" />
      <strong>No pudimos cargar esta vista</strong>
      <p>{message}</p>
      {apiError?.correlationId ? (
        <p className="technical-id">Correlación: {apiError.correlationId}</p>
      ) : null}
      <button type="button" className="button-secondary" onClick={retry}>
        Reintentar
      </button>
    </div>
  )
}
