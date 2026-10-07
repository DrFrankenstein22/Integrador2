import { Logger } from '@nestjs/common';
import type { NewRelicApi } from './newrelic.types';

let cached: NewRelicApi | null | undefined;

/**
 * Carga perezosa del agente. Nunca se hace `import newrelic from 'newrelic'`
 * a nivel de modulo: eso lo cargaria Jest tambien, y en tests no hay agente
 * arrancado ni `NEW_RELIC_LICENSE_KEY`. Si el paquete esta instalado pero no
 * se cargo con `-r newrelic`, `require('newrelic')` devuelve su stub_api
 * (todo no-op) — tampoco explota.
 */
export function getNewRelic(): NewRelicApi | null {
  if (cached !== undefined) {
    return cached;
  }

  // @prisma/client carga el .env real como efecto colateral de ser
  // *importado* (no de instanciarse) — asi que en tests, por el simple
  // hecho de que un servicio importe PrismaService, process.env ya trae
  // NEW_RELIC_LICENSE_KEY real aunque el test nunca haya pedido observabilidad.
  // JEST_WORKER_ID lo pone Jest en todo proceso worker: es el guard fiable
  // para que la suite de unit tests jamas intente conectar el agente real.
  if (
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NEW_RELIC_ENABLED === 'false' ||
    !process.env.NEW_RELIC_LICENSE_KEY
  ) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('newrelic') as NewRelicApi;
  } catch {
    new Logger('Observability').warn(
      'Agente New Relic no disponible; APM en modo no-op',
    );
    cached = null;
  }

  return cached;
}
