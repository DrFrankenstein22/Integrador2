import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { REQUIRED_PERMISSION_METADATA } from './require-permission.decorator';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuditPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      throw new ForbiddenException(
        'El endpoint administrativo no tiene un permiso configurado',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Falta el usuario autenticado');
    }

    const assignedRoles = await this.prisma.userRole.findMany({
      where: { userId: request.user.id },
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

    const allowed = assignedRoles.some(({ role }) =>
      role.rolePermissions.some(
        ({ permission }) => permission.code === requiredPermission,
      ),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'No tienes permiso para consultar la auditoría',
      );
    }

    return true;
  }
}
