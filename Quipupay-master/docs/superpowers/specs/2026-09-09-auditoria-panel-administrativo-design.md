# Diseño: Auditoría y panel administrativo de Quipupay

## Contexto

Quipupay tiene una aplicación móvil Expo para clientes y un backend NestJS con
PostgreSQL. La base ya contiene el esquema `audit`, la tabla
`audit.audit_events`, los roles `USER`, `AUDITOR` y `ADMIN`, y el permiso
`audit:read`. También existen registros especializados como
`auth.login_attempts`, y KYC ya materializa un evento en `audit.audit_events`.

La implementación actual no tiene un módulo transversal de auditoría, no aplica
los roles y permisos en guards, y no ofrece una interfaz para consultar la
actividad. Los logs técnicos del backend se consultan manualmente mediante
`journalctl` en la instancia AWS Lightsail. CloudWatch no está configurado.

Este diseño añade una auditoría funcional consultable y un panel web separado,
con cambios pequeños y aislados en el código existente. No reemplaza los logs
técnicos ni modifica la aplicación móvil.

## Objetivos

- Registrar acciones de negocio relevantes realizadas por usuarios.
- Mantener logs técnicos de todas las peticiones HTTP con un identificador de
  correlación.
- Permitir que `AUDITOR` y `ADMIN` consulten la actividad desde un panel web.
- Presentar cada evento con una descripción comprensible y su código técnico.
- Permitir investigar la actividad cronológica de un usuario.
- Evitar almacenar secretos, credenciales, imágenes o payloads completos.
- Concentrar los cambios en módulos nuevos para reducir conflictos con el
  trabajo paralelo del equipo.

## Fuera de alcance

- Enviar logs a CloudWatch o instalar el CloudWatch Agent.
- Crear una aplicación web para clientes.
- Agregar funciones administrativas de escritura, bloqueo o eliminación.
- Editar o eliminar eventos de auditoría.
- Crear una pantalla exclusiva de riesgos.
- Introducir colas, buses de eventos o microservicios.
- Crear un segundo sistema de autenticación para administradores.
- Cambiar la estructura de `audit.audit_events` en la primera versión.

## Decisiones principales

| Área | Decisión | Razón |
| --- | --- | --- |
| Alcance de captura | Enfoque híbrido | Los eventos funcionales van a PostgreSQL; todas las peticiones quedan en logs técnicos. |
| Integración | Interceptor global + decoradores selectivos | Automatiza datos comunes sin agregar llamadas manuales a cada servicio. |
| Persistencia | Reutilizar `audit.audit_events` | La tabla ya contiene actor, evento, entidad, correlación, resultado, red y metadata. |
| Login | Consultar `auth.login_attempts` sin duplicarlo | Conserva la fuente especializada existente y evita dos escrituras para el mismo intento. |
| Descripciones | Catálogo backend derivado de código + metadata | Evita duplicar texto en la base y mantiene una representación consistente. |
| Autorización | Roles asignan permisos; endpoints exigen permisos | Permite diferenciar `AUDITOR` y `ADMIN` sin acoplar controladores a nombres de rol. |
| Panel | React + Vite + TypeScript en `admin-web/` | Aplicación interna pequeña, independiente de Expo y sin necesidad de SSR. |
| Runtime del panel | Node.js 24 LTS | El panel es nuevo y puede adoptar la línea LTS vigente sin cambiar los runtimes del backend o móvil. |
| Despliegue | Fuera de la primera entrega | Todo se puede desarrollar y verificar localmente sin credenciales AWS. |

## Arquitectura

```text
Aplicación móvil ───────────────┐
                               │
Panel admin React/Vite ─────────┼── API NestJS ── PostgreSQL
                               │                    ├── audit.audit_events
                               │                    └── auth.login_attempts
                               │
                               └── logs técnicos ── stdout/systemd/journalctl
```

El repositorio mantiene tres aplicaciones claramente separadas:

```text
Quipupay/
  backend/
  mobile/
  admin-web/
```

`mobile/` no se modifica. `admin-web/` consume únicamente endpoints bajo
`/api/v1/admin`. El backend comparte autenticación y base de datos, pero aplica
un guard adicional de permisos a toda la superficie administrativa.

## Componentes backend

El nuevo módulo se concentra en `backend/src/audit/`:

```text
audit/
  audit.module.ts
  audit.interceptor.ts
  audit.service.ts
  audit-event.decorator.ts
  audit-event.catalog.ts
  audit.controller.ts
  audit-permissions.guard.ts
  require-permission.decorator.ts
  dto/
```

### `AuditModule`

- Registra `AuditInterceptor` como `APP_INTERCEPTOR` para conservar inyección de
  dependencias sin configurar cada controlador.
- Expone `AuditService` a los controladores administrativos.
- Declara el controller y el guard de permisos.
- Se importa una sola vez desde `AppModule`.

### `AuditInterceptor`

Para toda petición HTTP:

1. Lee `X-Correlation-ID` si contiene un UUID válido; de lo contrario genera un
   UUID.
2. Adjunta el identificador a la petición y a la respuesta.
3. Mide duración.
4. Escribe un log técnico estructurado al finalizar o fallar la petición.
5. Si el handler está decorado con `@AuditEvent`, solicita a `AuditService` que
   persista el evento funcional.

Los guards de NestJS se ejecutan antes del interceptor, por lo que las rutas
protegidas ya tendrán `request.user.id`. Para registro, el decorador permite
obtener el actor desde `response.user.id`. Los eventos pre-registro sin un actor
confiable no se fuerzan a pertenecer a un usuario.

Una escritura de auditoría fallida produce un log técnico con `correlationId` y
`eventType`, pero no sustituye ni altera la respuesta original. Esta política de
*fail open* es adecuada para el MVP académico; un producto regulado debería
evaluar una política transaccional o *fail closed* para eventos críticos.

### `@AuditEvent`

Solo se aplica a mutaciones de negocio relevantes. Su configuración contiene:

```ts
type AuditEventDefinition = {
  eventType: string;
  entityType?: string;
  actorResponsePath?: string;
  entityIdResponsePath?: string;
  metadataResponsePaths?: Record<string, string>;
};
```

Ejemplo conceptual:

```ts
@AuditEvent({
  eventType: 'ACCOUNT_OPENED',
  entityType: 'account',
  entityIdResponsePath: 'id',
  metadataResponsePaths: { productCode: 'productCode', currency: 'currency' },
})
@Post()
open(...) {}
```

Los paths se resuelven únicamente contra una lista declarada por el decorador;
el interceptor nunca serializa automáticamente el body o la respuesta completa.

### `AuditService`

- Persiste `AuditEvent` mediante Prisma.
- Normaliza IP y user-agent.
- Limita metadata a claves explícitamente permitidas.
- Convierte eventos de `audit.audit_events` y `auth.login_attempts` a un DTO
  administrativo común.
- Aplica filtros, orden descendente y paginación por cursor.
- Genera resúmenes con consultas de agregación sin mantener una tabla adicional.

### Catálogo de eventos

El catálogo mantiene códigos estables y funciones puras para producir títulos y
descripciones en español. La API, no el frontend, genera el texto visible.

Eventos iniciales:

| Código | Fuente | Descripción base |
| --- | --- | --- |
| `USER_REGISTERED` | `audit_events` | El usuario completó su registro. |
| `ACCOUNT_OPENED` | `audit_events` | El usuario abrió una cuenta `{product}` en `{currency}`. |
| `KYC_MATERIALIZED` | `audit_events` existente | La verificación de identidad finalizó con resultado `{decision}`. |
| `LOGIN_SUCCEEDED` | `login_attempts` | El usuario inició sesión correctamente. |
| `LOGIN_FAILED` | `login_attempts` | El intento de inicio de sesión fue rechazado por `{reason}`. |

Un código desconocido se muestra como código técnico con la descripción
“Evento registrado por Quipupay”; nunca provoca un error de lectura.

Los eventos futuros, como transferencias, se agregan al catálogo y al endpoint
correspondiente cuando esa funcionalidad tenga una ruta HTTP activa.

## Logs técnicos

Cada petición genera una línea estructurada con:

- `timestamp`
- `correlationId`
- `method`
- `route`
- `statusCode`
- `durationMs`
- `actorUserId`, si existe
- `ipAddress`
- `userAgent`
- `errorName`, solo en fallos

No se incluyen query strings completas, bodies, headers de autorización, PIN,
OTP, JWT, DNI completo ni contenido multipart. El backend escribe mediante el
logger de NestJS; `systemd` lo captura en `journalctl`. CloudWatch podrá consumir
esa salida en una etapa posterior sin cambiar el contrato de auditoría.

## Roles, permisos y autenticación

Se reutiliza el login actual con DNI y PIN. El JWT continúa identificando al
usuario por `sub`; no se confía en roles embebidos en el token.

Para cada petición administrativa:

1. `JwtAuthGuard` valida el JWT y llena `request.user`.
2. `AuditPermissionsGuard` consulta `user_roles`, `roles`,
   `role_permissions` y `permissions` mediante Prisma.
3. `@RequirePermission('audit:read')` exige el permiso.
4. Un usuario sin permiso recibe `403 Forbidden`.

Matriz inicial:

| Rol | Aplicación | Permisos relevantes |
| --- | --- | --- |
| `USER` | Móvil | Sin acceso administrativo |
| `AUDITOR` | Panel web | `audit:read` |
| `ADMIN` | Panel web | `audit:read`, `admin:write` |

El registro público asigna `USER` dentro de la misma transacción que crea al
usuario y su credencial. `AUDITOR` y `ADMIN` se asignan manualmente en la base de
datos por un operador autorizado; no existe endpoint público ni pantalla para
elevar privilegios en esta entrega.

## API administrativa

Todos los endpoints usan `JwtAuthGuard`, `AuditPermissionsGuard` y el permiso
`audit:read`.

### `GET /api/v1/admin/me`

Devuelve identidad administrativa mínima, roles y permisos. El panel lo consulta
después del login para aceptar o rechazar la sesión.

### `GET /api/v1/admin/audit/summary`

Parámetros: `from`, `to`. Devuelve totales de eventos, éxitos, fallos y usuarios
con actividad. Los intentos de login se incluyen mediante agregación desde
`auth.login_attempts`.

### `GET /api/v1/admin/audit/events`

Filtros opcionales:

- `cursor`
- `limit`, con máximo definido por el backend
- `actorUserId`
- `eventType`
- `result`
- `from`
- `to`
- `correlationId`

Devuelve eventos normalizados de `audit_events` y `login_attempts`, ordenados por
fecha descendente. Cada elemento contiene fuente, identificador, código, título,
descripción, resultado, actor resumido, entidad, correlación, red, metadata
sanitizada y fecha.

### `GET /api/v1/admin/audit/events/:source/:id`

`source` acepta únicamente `audit` o `login`. Devuelve el detalle normalizado o
`404` sin revelar si el identificador existía en otra fuente.

### `GET /api/v1/admin/users`

Busca usuarios por identificador, nombre o DNI enmascarado/entrada exacta. La
respuesta nunca entrega PIN, hashes, tokens ni información biométrica.

### `GET /api/v1/admin/users/:id/activity`

Devuelve el encabezado resumido del usuario y su línea cronológica unificada,
con los mismos filtros y paginación que el explorador de eventos.

## Panel administrativo

`admin-web/` será una SPA React + Vite + TypeScript sobre Node.js 24 LTS. Usará
la paleta existente de Quipupay y una capa API propia; no importará código desde
`mobile/`.

Cada aplicación administra su runtime e instalación de forma independiente:

- `backend/` conserva Node.js 20, que es la versión fijada por su CI actual.
- `mobile/` conserva su configuración actual sin cambios.
- `admin-web/` incluye `.nvmrc` con la línea `24`, declara
  `engines.node: ">=24 <25"` y tiene su propio job de CI con Node.js 24.

No se agrega una versión global de Node en la raíz porque obligaría a las tres
aplicaciones a compartir un runtime que hoy no comparten.

Rutas iniciales:

```text
/login
/
/events
/events/:source/:id
/users
/users/:id/activity
```

### Login

- Envía DNI y PIN al endpoint existente.
- Mantiene el access token en memoria durante la sesión del navegador.
- Consulta `/admin/me` inmediatamente.
- Si recibe `403`, elimina el token y muestra “Tu cuenta no tiene acceso al
  panel administrativo”.

No se persiste el JWT en `localStorage`. Recargar la página requiere iniciar
sesión nuevamente, una limitación aceptada para reducir alcance y exposición en
esta primera versión.

### Dashboard

- Tarjetas de eventos totales, exitosos, fallidos y usuarios activos.
- Filtros de fecha.
- Tabla de actividad reciente.
- Acceso al detalle del evento y al historial del actor.

### Explorador de eventos

- Búsqueda y filtros del endpoint administrativo.
- Descripción humana como texto principal.
- Código técnico visible debajo y disponible como filtro.
- Estados claros de carga, vacío, error y fin de paginación.

### Vista por usuario

- Identidad resumida y enmascarada.
- Último acceso, IP reciente y cantidad de eventos.
- Línea cronológica con descripción, código, resultado y correlación.
- Enlace al detalle de cada evento.

## Manejo de errores

| Caso | Backend | Panel |
| --- | --- | --- |
| JWT ausente o vencido | `401` | Volver al login. |
| Usuario sin `audit:read` | `403` | Cerrar sesión y explicar falta de acceso. |
| Evento o usuario inexistente | `404` | Mostrar estado no encontrado y volver al listado. |
| Filtros inválidos | `400` | Conservar formulario y mostrar validación. |
| Error de consulta | `500` con correlación | Mostrar reintento y el `correlationId`. |
| Error al escribir auditoría | Mantener respuesta original y generar log técnico | Sin impacto visible en la operación original. |
| Código sin catálogo | DTO con descripción genérica | Mostrar código y descripción genérica. |

## Privacidad y seguridad

- Los endpoints administrativos son de solo lectura.
- No existe endpoint para borrar o modificar auditoría.
- DNI y cuentas se muestran enmascarados en listados.
- La búsqueda exacta por DNI ocurre en el servidor y no se conserva en logs.
- Metadata utiliza listas permitidas por tipo de evento.
- Se excluyen contraseñas, PIN, OTP, JWT, cabeceras de autorización, fotos,
  videos, buffers, hashes de credenciales y payloads completos.
- Los errores externos muestran `correlationId`, no stack traces.
- Los roles administrativos nunca se asignan desde el registro público.

## Pruebas

### Backend unitario

- El interceptor conserva un UUID de correlación válido y reemplaza uno inválido.
- El interceptor agrega `X-Correlation-ID` a éxito y error.
- El log técnico contiene los campos permitidos y no serializa body o token.
- Un handler sin decorador no crea `AuditEvent`.
- Un handler decorado crea éxito o fallo con metadata permitida.
- Un error de persistencia de auditoría no cambia la respuesta original.
- El catálogo genera descripciones conocidas y fallback para códigos nuevos.
- El guard permite `AUDITOR`/`ADMIN` y rechaza `USER`.

### Backend integración

- El registro asigna `USER` dentro de su transacción.
- Todos los endpoints `/admin/*` requieren autenticación y `audit:read`.
- Filtros, límites, fechas y cursor producen resultados deterministas.
- La actividad por usuario mezcla audit y login en orden cronológico.
- Ninguna respuesta administrativa contiene campos sensibles.

### Panel

- Login exitoso con permiso abre el dashboard.
- `401` y `403` limpian la sesión y muestran el mensaje correspondiente.
- Dashboard presenta métricas y actividad reciente.
- Filtros actualizan la consulta sin perder el resto del estado.
- Seleccionar actor abre su historial.
- Seleccionar evento abre su detalle.
- Carga, vacío, error y reintento están cubiertos.

## Estrategia de entrega

La implementación se divide para reducir conflictos:

1. **Fundación backend:** interceptor, decorador, catálogo, sanitización,
   correlación y permisos.
2. **Consulta administrativa:** DTOs, endpoints, normalización de
   `audit_events`/`login_attempts` y pruebas de autorización.
3. **Panel web:** scaffold `admin-web/`, login, dashboard, explorador y vista por
   usuario, con Node.js 24 en desarrollo y CI.

Cada etapa debe compilar y pasar pruebas antes de iniciar la siguiente. La
primera entrega funciona localmente con PostgreSQL de Docker. El despliegue en
AWS y la integración con CloudWatch se coordinan después y requieren acceso
operativo separado, no credenciales AWS dentro del repositorio.

## Criterios de aceptación

- Una petición recibe un `X-Correlation-ID` utilizable para cruzar respuesta y
  log técnico.
- Las acciones decoradas crean eventos funcionales sin registrar payloads.
- Login y KYC aparecen en el historial usando sus fuentes existentes.
- `USER` no puede acceder a rutas administrativas.
- `AUDITOR` y `ADMIN` pueden consultar dashboard, eventos y usuarios.
- El panel muestra descripción y código para cada evento.
- Se puede navegar de un evento a su usuario y consultar su línea cronológica.
- Backend, móvil y panel permanecen como aplicaciones separadas; `mobile/` no
  recibe cambios.
- `admin-web/` declara y verifica Node.js 24 sin modificar el runtime del
  backend.
- La solución puede ejecutarse y demostrarse localmente sin acceso AWS.
