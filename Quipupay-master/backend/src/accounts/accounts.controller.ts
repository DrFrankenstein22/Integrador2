import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { OpenAccountDto } from './dto/open-account.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { AuditEvent } from '../audit/audit-event.decorator';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @AuditEvent({
    eventType: 'ACCOUNT_OPENED',
    entityType: 'account',
    entityIdResponsePath: 'id',
    metadataResponsePaths: {
      productCode: 'productCode',
      currency: 'currency',
    },
  })
  @ApiOperation({ summary: 'Abrir una cuenta (HU03)' })
  @ApiResponse({ status: 201, description: 'Cuenta creada' })
  @ApiResponse({ status: 401, description: 'Clave incorrecta' })
  @ApiResponse({ status: 409, description: 'Límite de cuentas del mismo tipo' })
  @ApiResponse({ status: 422, description: 'Contrato no aceptado o moneda no válida' })
  open(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenAccountDto) {
    return this.accountsService.openAccount(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis cuentas con saldo' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.accountsService.listAccounts(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una cuenta' })
  @ApiResponse({ status: 404, description: 'La cuenta no existe o no te pertenece' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.accountsService.getAccount(user.id, id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activar una cuenta con el depósito inicial (HU03b)' })
  @ApiResponse({ status: 201, description: 'Cuenta activada' })
  @ApiResponse({ status: 401, description: 'Clave incorrecta' })
  @ApiResponse({ status: 404, description: 'La cuenta no existe o no te pertenece' })
  @ApiResponse({ status: 409, description: 'La cuenta ya está activa' })
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ActivateAccountDto,
  ) {
    return this.accountsService.activateAccount(user.id, id, dto);
  }
}
