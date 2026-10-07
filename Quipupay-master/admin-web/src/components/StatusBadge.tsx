import { AlertTriangle, CheckCircle2, Circle, XCircle } from 'lucide-react'

const success = new Set(['SUCCESS', 'SUCCEEDED', 'APPROVED', 'APROBADO'])
const failure = new Set(['FAILURE', 'FAILED', 'REJECTED', 'RECHAZADO'])
const warning = new Set(['BLOCKED', 'BLOQUEADO', 'REVIEW', 'REVISION'])

export function StatusBadge({ result, size }: { result: string; size?: 'lg' }) {
  const normalized = result.toUpperCase()
  const base = 'status-badge' + (size === 'lg' ? ' status-badge-lg' : '')
  const iconSize = size === 'lg' ? 14 : 13

  if (success.has(normalized)) {
    const label = normalized.includes('APPRO') ? 'Aprobado' : 'Éxito'
    return (
      <span className={base + ' status-success'}>
        <CheckCircle2 size={iconSize} aria-hidden="true" />
        {label}
      </span>
    )
  }
  if (failure.has(normalized)) {
    return (
      <span className={base + ' status-error'}>
        <XCircle size={iconSize} aria-hidden="true" />
        Fallo
      </span>
    )
  }
  if (warning.has(normalized)) {
    return (
      <span className={base + ' status-warning'}>
        <AlertTriangle size={iconSize} aria-hidden="true" />
        Revisión
      </span>
    )
  }
  return (
    <span className={base + ' status-neutral'}>
      <Circle size={iconSize - 1} aria-hidden="true" />
      {result}
    </span>
  )
}

const userStatusMeta: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  ACTIVE: { label: 'Activo', tone: 'success' },
  PENDING_VERIFICATION: { label: 'Pendiente de verificación', tone: 'warning' },
  REVIEW_REQUIRED: { label: 'Pendiente de verificación', tone: 'warning' },
  REJECTED: { label: 'Verificación rechazada', tone: 'error' },
}

export function UserStatusBadge({ status }: { status: string }) {
  const meta = userStatusMeta[status.toUpperCase()]
  return (
    <span className={'status-badge status-' + (meta?.tone ?? 'neutral')}>
      {meta?.label ?? status}
    </span>
  )
}
