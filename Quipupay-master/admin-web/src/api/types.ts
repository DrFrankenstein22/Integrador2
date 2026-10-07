export type ActivitySource = 'audit' | 'login'

export type AdminIdentity = {
  id: string
  displayName: string
  maskedDni: string
  roles: string[]
  permissions: string[]
}

export type AuditMetadataValue = string | number | boolean | null

export type AdminActivityEvent = {
  source: ActivitySource
  id: string
  eventType: string
  title: string
  description: string
  result: string
  actor: { id: string; displayName: string; maskedDni: string } | null
  entity: { type: string; id: string } | null
  correlationId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, AuditMetadataValue>
  createdAt: string
}

export type ActivityPage = {
  items: AdminActivityEvent[]
  nextCursor: string | null
}

export type AuditSummary = {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  activeUsers: number
  from: string
  to: string
}

export type AdminUserSummary = {
  id: string
  displayName: string
  maskedDni: string
  status: string
  lastActivityAt: string | null
}

export type AdminUserPage = {
  items: AdminUserSummary[]
  nextCursor: string | null
}

export type UserActivityPage = {
  user: AdminUserSummary & {
    recentIpAddress: string | null
    eventCount: number
  }
  activity: ActivityPage
}

export type LoginResponse = {
  accessToken: string
}
