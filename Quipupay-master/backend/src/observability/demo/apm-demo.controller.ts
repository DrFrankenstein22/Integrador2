import { BadRequestException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ok, ApiResponse } from '../../common/api/api-response';
import { PrismaService } from '../../prisma/prisma.service';
import { ObservabilityService } from '../observability.service';
import { DemoEnabledGuard } from './demo-enabled.guard';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampInt(raw: string, min: number, max: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Endpoint de demo para exponer New Relic APM en clase: genera latencia
 * variable, errores capturados/no capturados y carga de BD a proposito.
 * Bloqueado en produccion por DemoEnabledGuard + por no registrarse en
 * ObservabilityModule cuando NODE_ENV=production (ver observability.module.ts).
 */
@ApiTags('demo-apm')
@UseGuards(DemoEnabledGuard)
@Controller('demo/apm')
export class ApmDemoController {
  constructor(
    private readonly obs: ObservabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('latency')
  async latency(
    @Query('ms') ms = '300',
    @Query('jitter') jitter = '400',
  ): Promise<ApiResponse<{ totalMs: number }>> {
    const base = clampInt(ms, 0, 5000);
    const extra = Math.floor(Math.random() * clampInt(jitter, 0, 5000));

    this.obs.setTransactionName('Demo/ApmLatency');
    await this.obs.startSegment('demo/pre-process', true, () => sleep(base * 0.3));
    await this.obs.startSegment('demo/heavy-work', true, () => sleep(base * 0.7 + extra));

    const totalMs = base + extra;
    this.obs.recordMetric('Custom/Demo/LatencyMs', totalMs);
    return ok('Latencia simulada', { totalMs });
  }

  @Get('error/handled')
  handled(): never {
    const err = new BadRequestException('Saldo insuficiente (simulado)');
    this.obs.noticeError(err, { errorKind: 'BUSINESS_RULE', demo: true });
    this.obs.incrementMetric('Custom/Demo/Errors/Handled');
    throw err;
  }

  @Get('error/unhandled')
  unhandled(): never {
    // Error plano, sin capturar -> 500 -> Errors Inbox con stack trace.
    throw new Error('Fallo inesperado del motor de liquidación (simulado)');
  }

  @Get('slow-query')
  async slowQuery(
    @Query('seconds') seconds = '1',
  ): Promise<ApiResponse<{ seconds: number; auditEvents: number }>> {
    const s = clampInt(seconds, 0, 5);

    // pg_sleep() devuelve `void`: $queryRaw intenta deserializar el tipo de
    // columna y falla ("Failed to deserialize column of type 'void'").
    // $executeRaw no tipa el resultado, asi que le viene bien a un comando
    // que solo importa por su efecto (aqui, tardar).
    await this.obs.startSegment('demo/pg-sleep', true, () =>
      this.prisma.$executeRaw`SELECT pg_sleep(${s}::int)`,
    );
    const auditEvents = await this.obs.startSegment('demo/count-audit', true, () =>
      this.prisma.auditEvent.count(),
    );

    return ok('Consulta lenta simulada', { seconds: s, auditEvents });
  }

  @Post('burst')
  async burst(@Query('n') n = '30'): Promise<ApiResponse<{ transactions: number }>> {
    const total = clampInt(n, 1, 200);

    for (let i = 0; i < total; i += 1) {
      void this.obs.startBackgroundTransaction('Demo/Burst', 'Demo', async () => {
        await sleep(50 + Math.random() * 500);
        this.obs.recordEvent('QuipupayTransfer', {
          transactionId: `demo-${i}-${Date.now()}`,
          amount: Number((Math.random() * 500).toFixed(2)),
          currency: 'PEN',
          status: 'PENDING',
          hasReference: Math.random() < 0.5,
          demo: true,
        });
        if (Math.random() < 0.15) {
          this.obs.noticeError(new Error('Timeout de red simulado'), { demo: true });
        }
      });
    }

    return ok('Ráfaga lanzada', { transactions: total });
  }
}
