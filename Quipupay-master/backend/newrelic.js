'use strict';

// El agente se carga con `node -r newrelic` ANTES que cualquier modulo de Nest,
// asi que ConfigModule todavia no existe: cargamos el .env aqui a mano.
// dotenv no pisa variables ya presentes en process.env, y @nestjs/config tampoco,
// asi que cargarlo dos veces es idempotente.
require('dotenv').config();

// NODE_OPTIONS='-r newrelic' se hereda a TODO proceso node hijo (el CLI de Nest,
// tsc --watch, workers de jest). Sin este guard tendriamos varios agentes
// conectando y basura en la UI. Solo instrumentamos el proceso cuyo entrypoint
// es main(.js).
const entry = process.argv[1] || '';
const isAppProcess = /(^|[\\/])main(\.js)?$/.test(entry);

const enabled =
  isAppProcess &&
  process.env.NEW_RELIC_ENABLED !== 'false' &&
  Boolean(process.env.NEW_RELIC_LICENSE_KEY);

// OJO: NEW_RELIC_ENABLED es una variable que el propio agente reconoce y
// mapea directo a `agent_enabled` — con PRECEDENCIA SOBRE este archivo. Si
// .env trae NEW_RELIC_ENABLED=true, esa "verdad" se le impone al `enabled`
// calculado arriba en TODOS los procesos (el CLI de Nest, tsc --watch, no
// solo main.js), anulando el guard de argv por completo. Por eso .env.example
// NO define NEW_RELIC_ENABLED por defecto — solo se usa como apagador
// explicito (NEW_RELIC_ENABLED=false), nunca como encendido.

exports.config = {
  agent_enabled: enabled,
  app_name: [process.env.NEW_RELIC_APP_NAME || 'Quipupay Backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  // OJO: no declarar la clave `host` en absoluto si no hay override. El
  // agente hace merge de esta config con sus defaults comprobando si la
  // clave esta presente, no si es undefined — un `host: undefined` explicito
  // pisa el hostname por defecto (collector.newrelic.com) y el agente falla
  // con "Must include collector hostname!". Cuentas EU: la key empieza con
  // "eu01xx"; en ese caso define NEW_RELIC_HOST=collector.eu01.nr-data.net
  // en el .env o el agente nunca conecta.
  ...(process.env.NEW_RELIC_HOST ? { host: process.env.NEW_RELIC_HOST } : {}),

  labels: {
    env: process.env.NODE_ENV || 'development',
    project: 'quipupay',
    course: 'utp',
  },

  // stdout: no escribe newrelic_agent.log en el repo ni en el contenedor.
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout',
  },

  distributed_tracing: { enabled: true },

  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated', // NUNCA 'raw': hay DNI y montos en los WHERE
    explain_threshold: 500,
  },

  slow_sql: { enabled: true, max_samples: 10 },

  error_collector: {
    enabled: true,
    // 4xx de negocio esperados: credenciales malas (401), DNI duplicado (409),
    // validacion de ValidationPipe (400), recurso ajeno (403/404).
    // Si no se ignoran, el error rate del dashboard es puro ruido de usuario.
    ignore_status_codes: [400, 401, 403, 404, 409, 422],
  },

  custom_insights_events: { enabled: true, max_samples_stored: 3000 },
  transaction_events: { enabled: true },

  // No usan winston ni pino (Logger de Nest a stdout), asi que el forwarding
  // del agente no engancharia nada. La correlacion APM<->log se hace via el
  // atributo custom correlationId (ver ObservabilityInterceptor).
  application_logging: {
    enabled: true,
    forwarding: { enabled: false },
    local_decorating: { enabled: false },
    metrics: { enabled: true },
  },

  // IAST / seguridad: fuera, es otro producto y mete overhead.
  security: { agent: { enabled: false }, enabled: false },
  ai_monitoring: { enabled: false },

  // ---------- Higiene de PII (proyecto de banca) ----------
  // NO usar high_security: true. HSM fuerza record_sql=obfuscated pero tambien
  // DESACTIVA atributos y eventos custom, que son justo el corazon de esta demo.
  // En su lugar, exclusion explicita.
  allow_all_headers: false,
  attributes: {
    enabled: true,
    exclude: [
      // Credenciales y sesion
      'request.headers.authorization',
      'request.headers.cookie',
      'request.headers.x-api-key',
      'request.headers.proxyAuthorization',
      'response.headers.setCookie*',
      // Query string y body: pueden traer dni, pin, otp
      'request.parameters.*',
      // Identidad peruana y datos de contacto, por si algun atributo custom se cuela
      'dni',
      '*.dni',
      'password',
      '*.password',
      'pin',
      '*.pin',
      'otp',
      '*.otp',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',
      'email',
      '*.email',
      'phone',
      '*.phone',
      'firstName',
      'lastName',
      '*.firstName',
      '*.lastName',
      // KYC: claves de sesion (son capability tokens) y cualquier dato biometrico
      'sessionKey',
      '*.sessionKey',
      'frames',
      'video',
      'neutralFrame',
      'selfie*',
      'document*',
    ],
  },

  // El health check inflaria el throughput y falsearia el Apdex de la clase.
  rules: { ignore: ['^WebTransaction/Expressjs/GET//api/v1/health$'] },
};
