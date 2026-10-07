import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditPermissionsGuard } from './audit-permissions.guard';
import { AuditService } from './audit.service';
import type { ActivitySource } from './audit.types';
import { AuditQueryDto } from './dto/audit-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { RequirePermission } from './require-permission.decorator';

@ApiTags('Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AuditPermissionsGuard)
@RequirePermission('audit:read')
@Controller('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener la identidad administrativa actual' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auditService.getAdminIdentity(user.id);
  }

  @Get('audit/summary')
  @ApiOperation({ summary: 'Obtener el resumen de actividad auditada' })
  summary(@Query() query: DateRangeQueryDto) {
    return this.auditService.getSummary(query);
  }

  @Get('audit/events')
  @ApiOperation({ summary: 'Explorar eventos de auditoría y accesos' })
  events(@Query() query: AuditQueryDto) {
    return this.auditService.listEvents(query);
  }

  @Get('audit/events/:source/:id')
  @ApiOperation({ summary: 'Obtener el detalle normalizado de un evento' })
  @ApiParam({ name: 'source', enum: ['audit', 'login'] })
  event(
    @Param('source') source: ActivitySource,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.auditService.getEvent(source, id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Buscar usuarios para revisión de actividad' })
  users(@Query() query: UserQueryDto) {
    return this.auditService.listUsers(query);
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Consultar la actividad de un usuario' })
  userActivity(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.getUserActivity(userId, query);
  }
}
