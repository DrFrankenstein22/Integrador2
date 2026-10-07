import type { LucideIcon } from 'lucide-react'

type MetricCardProps = {
  label: string
  value: number
  icon: LucideIcon
  tone?: 'neutral' | 'success' | 'danger'
}

export function MetricCard({ label, value, icon: Icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={'metric metric-' + tone}>
      <div>
        <p>{label}</p>
        <strong>{new Intl.NumberFormat('es-PE').format(value)}</strong>
      </div>
      <Icon size={19} aria-hidden="true" />
    </article>
  )
}
