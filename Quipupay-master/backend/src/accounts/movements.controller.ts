import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MovementsService } from './movements.service';

@ApiTags('Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get('accounts/:id/movements')
  @ApiOperation({ summary: 'Movimientos de una cuenta (HU04)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') accountId: string,
    @Query('type') type?: 'all' | 'in' | 'out',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movements.list(user.id, accountId, {
      type,
      from,
      to,
      q,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Comprobante de un movimiento' })
  receipt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movements.receipt(user.id, id);
  }

  @Post('accounts/:id/demo-movements')
  @ApiOperation({ summary: 'Sembrar movimientos de demostración (solo desarrollo)' })
  seed(@CurrentUser() user: AuthenticatedUser, @Param('id') accountId: string) {
    return this.movements.seedDemo(user.id, accountId);
  }
}
