import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  decodeAuditCursor,
  encodeAuditCursor,
  type AuditCursor,
} from './audit-cursor';
import { describeAuditEvent } from './audit-event.catalog';
import type {
  ActivityPage,
  ActivitySource,
  AdminActivityEvent,
  AdminIdentity,
  AdminUserPage,
  AdminUserSummary,
  AuditMetadata,
  AuditMetadataValue,
  AuditRecordInput,
  AuditSummary,
  UserActivityPage,
} from './audit.types';
import type { AuditQueryDto } from './dto/audit-query.dto';
import type { DateRangeQueryDto } from './dto/date-range-query.dto';
import type { UserQueryDto } from './dto/user-query.dto';

type ActorRow = {
  id: string;
  dni: string;
  profile: { firstName: string; lastName: string } | null;
};

type AuditRow = {
  id: string;
  actorUserId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  correlationId: string;
  result: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
  actor: ActorRow | null;
};

type LoginRow = {
  id: string;
  userId: string | null;
  channel: string;
  result: string;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: ActorRow | null;
  device: { platform: string } | null;
};

type UserRow = ActorRow & {
  statusCode: string;
  auditEvents: { createdAt: Date }[];
  loginAttempts: { createdAt: Date }[];
};

const ACTOR_SELECT = {
  id: true,
  dni: true,
  profile: { select: { firstName: true, lastName: true } },
} as const;

const AUDIT_SELECT = {
  id: true,
  actorUserId: true,
  eventType: true,
  entityType: true,
  entityId: true,
  correlationId: true,
  result: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
  createdAt: true,
  actor: { select: ACTOR_SELECT },
} as const;

const LOGIN_SELECT = {
  id: true,
  userId: true,
  channel: true,
  result: true,
  failureReason: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  user: { select: ACTOR_SELECT },
  device: { select: { platform: true } },
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function maskDni(dni: string): string {
  const visible = dni.slice(-4);
  return `${'•'.repeat(Math.max(0, dni.length - visible.length))}${visible}`;
}

function actorSummary(actor: ActorRow | null) {
  if (!actor) return null;

  const maskedDni = maskDni(actor.dni);
  const fullName = actor.profile
    ? `${actor.profile.firstName} ${actor.profile.lastName}`.trim()
    : '';
  return {
    id: actor.id,
    displayName: fullName || `Usuario ${maskedDni}`,
    maskedDni,
  };
}

function safeMetadata(value: unknown): AuditMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const metadata: AuditMetadata = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      item === null ||
      typeof item === 'string' ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    ) {
      metadata[key] = item as AuditMetadataValue;
    }
  }
  return metadata;
}

export function normalizeAudit(row: AuditRow): AdminActivityEvent {
  const metadata = safeMetadata(row.metadata);
  const display = describeAuditEvent(row.eventType, metadata, row.result);
  return {
    source: 'audit',
    id: row.id,
    eventType: row.eventType,
    ...display,
    result: row.result,
    actor: actorSummary(row.actor),
    entity:
      row.entityType && row.entityId
        ? { type: row.entityType, id: row.entityId }
        : null,
    correlationId: row.correlationId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

export function normalizeLogin(row: LoginRow): AdminActivityEvent {
  const eventType =
    row.result === 'SUCCESS' ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED';
  const metadata: AuditMetadata = { channel: row.channel };
  if (row.failureReason) metadata.reason = row.failureReason;
  if (row.device?.platform) metadata.devicePlatform = row.device.platform;
  const display = describeAuditEvent(eventType, metadata, row.result);
  return {
    source: 'login',
    id: row.id,
    eventType,
    ...display,
    result: row.result,
    actor: actorSummary(row.user),
    entity: null,
    correlationId: null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function compareActivity(
  left: AdminActivityEvent | AuditCursor,
  right: AdminActivityEvent | AuditCursor,
): number {
  const byTime =
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (byTime !== 0) return byTime;
  const bySource = left.source.localeCompare(right.source);
  return bySource !== 0 ? bySource : right.id.localeCompare(left.id);
}

function laterDate(
  left: { createdAt: Date; ipAddress: string | null } | null,
  right: { createdAt: Date; ipAddress: string | null } | null,
) {
  if (!left) return right;
  if (!right) return left;
  return left.createdAt >= right.createdAt ? left : right;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        correlationId: input.correlationId,
        result: input.result,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
  }

  async listEvents(query: AuditQueryDto): Promise<ActivityPage> {
    const limit = query.limit ?? 25;
    const range = this.dateRange(query);
    const cursor = query.cursor ? decodeAuditCursor(query.cursor) : undefined;
    const createdAt = this.createdAtFilter(range, cursor);
    const loginEvent =
      query.eventType === 'LOGIN_SUCCEEDED' ||
      query.eventType === 'LOGIN_FAILED';
    const loginResult =
      query.eventType === 'LOGIN_SUCCEEDED'
        ? 'SUCCESS'
        : query.eventType === 'LOGIN_FAILED'
          ? 'FAILURE'
          : query.result;
    const conflictingLoginResult =
      loginEvent && query.result !== undefined && query.result !== loginResult;
    const auditAllowed = query.source !== 'login' && !loginEvent;
    const loginAllowed =
      query.source !== 'audit' &&
      !query.correlationId &&
      !query.entityType &&
      !query.entityId &&
      (!query.eventType || loginEvent) &&
      !conflictingLoginResult;

    const auditWhere: Prisma.AuditEventWhereInput = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.correlationId
        ? { correlationId: query.correlationId }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const loginWhere: Prisma.LoginAttemptWhereInput = {
      ...(query.actorUserId ? { userId: query.actorUserId } : {}),
      ...(loginResult ? { result: loginResult } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [auditRows, loginRows] = await Promise.all([
      auditAllowed
        ? this.prisma.auditEvent.findMany({
            where: auditWhere,
            select: AUDIT_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
          })
        : Promise.resolve([]),
      loginAllowed
        ? this.prisma.loginAttempt.findMany({
            where: loginWhere,
            select: LOGIN_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
          })
        : Promise.resolve([]),
    ]);

    const merged = [
      ...(auditRows as unknown as AuditRow[]).map(normalizeAudit),
      ...(loginRows as unknown as LoginRow[]).map(normalizeLogin),
    ]
      .sort(compareActivity)
      .filter((event) => !cursor || compareActivity(event, cursor) > 0);
    const items = merged.slice(0, limit);
    const finalItem = items.at(-1);
    return {
      items,
      nextCursor:
        merged.length > limit && finalItem
          ? encodeAuditCursor({
              createdAt: finalItem.createdAt,
              source: finalItem.source,
              id: finalItem.id,
            })
          : null,
    };
  }

  async getEvent(
    source: ActivitySource,
    id: string,
  ): Promise<AdminActivityEvent> {
    if (source === 'audit') {
      const row = await this.prisma.auditEvent.findUnique({
        where: { id },
        select: AUDIT_SELECT,
      });
      if (!row) throw new NotFoundException('El evento no existe');
      return normalizeAudit(row as unknown as AuditRow);
    }
    if (source === 'login') {
      const row = await this.prisma.loginAttempt.findUnique({
        where: { id },
        select: LOGIN_SELECT,
      });
      if (!row) throw new NotFoundException('El evento no existe');
      return normalizeLogin(row as unknown as LoginRow);
    }
    throw new BadRequestException('La fuente de actividad no es válida');
  }

  async getSummary(query: DateRangeQueryDto): Promise<AuditSummary> {
    const range = this.dateRange(query);
    const where = range ? { createdAt: range } : {};
    const [auditGroups, loginGroups, auditActors, loginActors] =
      await Promise.all([
        this.prisma.auditEvent.groupBy({
          by: ['result'],
          where,
          _count: { _all: true },
        }),
        this.prisma.loginAttempt.groupBy({
          by: ['result'],
          where,
          _count: { _all: true },
        }),
        this.prisma.auditEvent.findMany({
          where: { ...where, actorUserId: { not: null } },
          select: { actorUserId: true },
          distinct: ['actorUserId'],
        }),
        this.prisma.loginAttempt.findMany({
          where: { ...where, userId: { not: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);
    const groups = [...auditGroups, ...loginGroups];
    const countFor = (results: string[]) =>
      groups
        .filter(({ result }) => results.includes(result))
        .reduce((total, group) => total + group._count._all, 0);
    const actorIds = new Set<string>();
    auditActors.forEach(({ actorUserId }) => {
      if (actorUserId) actorIds.add(actorUserId);
    });
    loginActors.forEach(({ userId }) => {
      if (userId) actorIds.add(userId);
    });
    const bounds = this.summaryBounds(query);

    return {
      totalEvents: groups.reduce(
        (total, group) => total + group._count._all,
        0,
      ),
      successfulEvents: countFor(['SUCCESS', 'APPROVED']),
      failedEvents: countFor(['FAILURE', 'REJECTED']),
      activeUsers: actorIds.size,
      from: bounds.from.toISOString(),
      to: bounds.to.toISOString(),
    };
  }

  async listUsers(query: UserQueryDto): Promise<AdminUserPage> {
    const limit = query.limit ?? 25;
    const search = query.query?.trim();
    const where: Prisma.UserWhereInput = search
      ? { OR: this.userSearch(search) }
      : {};
    const rows = await this.prisma.user.findMany({
      where,
      select: {
        ...ACTOR_SELECT,
        statusCode: true,
        createdAt: true,
        auditEvents: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        loginAttempts: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit) as unknown as UserRow[];
    return {
      items: pageRows.map((row) => this.userSummary(row)),
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }

  async getUserActivity(
    userId: string,
    query: AuditQueryDto,
  ): Promise<UserActivityPage> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...ACTOR_SELECT, statusCode: true },
    });
    if (!user) throw new NotFoundException('El usuario no existe');

    const [activity, auditCount, loginCount, latestAudit, latestLogin] =
      await Promise.all([
        this.listEvents({ ...query, actorUserId: userId }),
        this.prisma.auditEvent.count({ where: { actorUserId: userId } }),
        this.prisma.loginAttempt.count({ where: { userId } }),
        this.prisma.auditEvent.findFirst({
          where: { actorUserId: userId },
          select: { createdAt: true, ipAddress: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        this.prisma.loginAttempt.findFirst({
          where: { userId },
          select: { createdAt: true, ipAddress: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      ]);
    const latest = laterDate(latestAudit, latestLogin);
    const summary = actorSummary(user as ActorRow)!;
    return {
      user: {
        ...summary,
        status: user.statusCode,
        lastActivityAt: latest?.createdAt.toISOString() ?? null,
        recentIpAddress: latest?.ipAddress ?? null,
        eventCount: auditCount + loginCount,
      },
      activity,
    };
  }

  async getAdminIdentity(userId: string): Promise<AdminIdentity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...ACTOR_SELECT,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                rolePermissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('El usuario no existe');

    const identity = actorSummary(user as ActorRow)!;
    const roles = user.userRoles.map(({ role }) => role.code).sort();
    const permissions = [
      ...new Set(
        user.userRoles.flatMap(({ role }) =>
          role.rolePermissions.map(({ permission }) => permission.code),
        ),
      ),
    ].sort();
    return { ...identity, roles, permissions };
  }

  private userSummary(row: UserRow): AdminUserSummary {
    const identity = actorSummary(row)!;
    const auditDate = row.auditEvents[0]?.createdAt;
    const loginDate = row.loginAttempts[0]?.createdAt;
    const lastActivity =
      auditDate && loginDate
        ? auditDate >= loginDate
          ? auditDate
          : loginDate
        : auditDate || loginDate;
    return {
      ...identity,
      status: row.statusCode,
      lastActivityAt: lastActivity?.toISOString() ?? null,
    };
  }

  private userSearch(search: string): Prisma.UserWhereInput[] {
    if (/^\d{8}$/.test(search)) return [{ dni: search }];
    if (UUID_PATTERN.test(search)) return [{ id: search }];
    const lastFourDigits = search.match(/(\d{4})$/)?.[1];
    const nameFilter: Prisma.UserWhereInput = {
      profile: {
        is: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    };
    return lastFourDigits
      ? [{ dni: { endsWith: lastFourDigits } }, nameFilter]
      : [nameFilter];
  }

  private dateRange(query: DateRangeQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime())) ||
      (from && to && from > to)
    ) {
      throw new BadRequestException('El rango de fechas no es válido');
    }
    return from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;
  }

  private createdAtFilter(
    range: { gte?: Date; lte?: Date } | undefined,
    cursor: AuditCursor | undefined,
  ) {
    if (!cursor) return range;
    const cursorDate = new Date(cursor.createdAt);
    const lte = range?.lte && range.lte < cursorDate ? range.lte : cursorDate;
    return { ...(range?.gte ? { gte: range.gte } : {}), lte };
  }

  private summaryBounds(query: DateRangeQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
