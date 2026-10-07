import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuditPermissionsGuard } from '../src/audit/audit-permissions.guard';
import { RequirePermission } from '../src/audit/require-permission.decorator';
import type { PrismaService } from '../src/prisma/prisma.service';

class PermissionHandlers {
  @RequirePermission('audit:read')
  protectedRoute() {}

  noPermissionMetadata() {}
}

function contextFor(
  handler: (...args: never[]) => unknown,
  user: { id: string; dni: string } | null = {
    id: 'user-1',
    dni: '12345678',
  },
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => PermissionHandlers,
    switchToHttp: () => ({
      getRequest: () => ({ user: user ?? undefined }),
    }),
  } as unknown as ExecutionContext;
}

function roleRows(role: 'USER' | 'AUDITOR' | 'ADMIN') {
  const permissionCodes =
    role === 'USER'
      ? ['users:read', 'accounts:read']
      : role === 'AUDITOR'
        ? ['users:read', 'audit:read']
        : ['users:read', 'audit:read', 'admin:write'];

  return [
    {
      role: {
        code: role,
        rolePermissions: permissionCodes.map((code) => ({
          permission: { code },
        })),
      },
    },
  ];
}

describe('AuditPermissionsGuard', () => {
  it.each([
    ['USER', false],
    ['AUDITOR', true],
    ['ADMIN', true],
  ] as const)('checks audit:read for %s', async (role, allowed) => {
    const findMany = jest.fn().mockResolvedValue(roleRows(role));
    const prisma = {
      userRole: { findMany },
    } as unknown as PrismaService;
    const guard = new AuditPermissionsGuard(new Reflector(), prisma);
    const result = guard.canActivate(
      contextFor(PermissionHandlers.prototype.protectedRoute),
    );

    if (allowed) {
      await expect(result).resolves.toBe(true);
    } else {
      await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    });
  });

  it('rejects a request without an authenticated user', async () => {
    const prisma = {
      userRole: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const guard = new AuditPermissionsGuard(new Reflector(), prisma);

    await expect(
      guard.canActivate(
        contextFor(PermissionHandlers.prototype.protectedRoute, null),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a handler that forgot to declare its required permission', async () => {
    const prisma = {
      userRole: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const guard = new AuditPermissionsGuard(new Reflector(), prisma);

    await expect(
      guard.canActivate(
        contextFor(PermissionHandlers.prototype.noPermissionMetadata),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
