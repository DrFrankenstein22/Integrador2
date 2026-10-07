import { apiFetch } from './client'
import type {
  ActivityPage,
  ActivitySource,
  AdminActivityEvent,
  AdminUserPage,
  AuditSummary,
  UserActivityPage,
} from './types'

export type AuditFilters = {
  source?: ActivitySource
  eventType?: string
  result?: string
  actorUserId?: string
  correlationId?: string
  from?: string
  to?: string
  limit?: number
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? '?' + query : ''
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function limaCalendarBoundary(value: string | undefined, endOfDay: boolean) {
  const match = value?.match(CALENDAR_DATE)
  if (!match) return value

  const [, year, month, day] = match
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  const start = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber, 5))
  if (
    start.getUTCFullYear() !== yearNumber ||
    start.getUTCMonth() !== monthNumber - 1 ||
    start.getUTCDate() !== dayNumber
  ) {
    return value
  }
  const startUtc = start.getTime()
  return new Date(startUtc + (endOfDay ? 86_400_000 - 1 : 0)).toISOString()
}

function withInclusiveLimaDates(filters: AuditFilters): AuditFilters {
  return {
    ...filters,
    from: limaCalendarBoundary(filters.from, false),
    to: limaCalendarBoundary(filters.to, true),
  }
}

export function getAuditSummary(filters: Pick<AuditFilters, 'from' | 'to'>) {
  const dates = withInclusiveLimaDates(filters)
  return apiFetch<AuditSummary>(
    '/admin/audit/summary' + queryString({ from: dates.from, to: dates.to }),
  )
}

export function getAuditEvents(filters: AuditFilters, cursor?: string) {
  return apiFetch<ActivityPage>(
    '/admin/audit/events' + queryString({ ...withInclusiveLimaDates(filters), cursor }),
  )
}

export function getAuditEvent(source: ActivitySource, id: string) {
  return apiFetch<AdminActivityEvent>('/admin/audit/events/' + source + '/' + id)
}

export function getUsers(query: string, cursor?: string) {
  return apiFetch<AdminUserPage>(
    '/admin/users' + queryString({ query: query.trim() || undefined, cursor, limit: 25 }),
  )
}

export function getUserActivity(
  userId: string,
  filters: AuditFilters,
  cursor?: string,
) {
  return apiFetch<UserActivityPage>(
    '/admin/users/' + userId + '/activity' +
      queryString({ ...withInclusiveLimaDates(filters), cursor }),
  )
}
