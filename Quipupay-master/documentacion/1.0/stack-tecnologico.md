# Stack Tecnologico Oficial - Quipupay

## Resumen

Quipupay es una plataforma academica de banca digital tipo fintech. El stack oficial prioriza productividad, arquitectura modular, seguridad, trazabilidad y facilidad de integracion entre mobile y backend usando TypeScript como base principal.

## Stack principal

| Capa | Tecnologia | Uso en Quipupay |
| --- | --- | --- |
| Mobile | React Native + Expo Go + TypeScript | Aplicacion movil, onboarding, login, dashboard, transferencias y experiencia principal del usuario. |
| Backend | NestJS + TypeScript | API REST modular, servicios de negocio, autenticacion, cuentas, ledger, transferencias, auditoria y administracion. |
| Base de datos | PostgreSQL | Persistencia principal de usuarios, cuentas, movimientos, transacciones, auditoria y configuracion. |
| Migraciones | Flyway | Fuente de verdad para esquemas, tablas, constraints, seeds e indices SQL. |
| ORM | Prisma | Cliente tipado e introspeccion de la base despues de ejecutar Flyway. |
| Cache / temporales | Redis | OTP, rate limiting, sesiones temporales, locks e informacion efimera. |
| Archivos e imagenes | Cloudflare R2 | Almacenamiento de objetos para imagenes de DNI, selfies, comprobantes simulados y archivos del sistema. |
| Correos | Resend | Correos transaccionales: verificacion, recuperacion, alertas de seguridad y notificaciones operativas. |
| API Docs | Swagger / OpenAPI | Documentacion de endpoints para desarrollo, pruebas y sustentacion. |
| Testing | Jest | Pruebas unitarias y de integracion del backend. |
| DevOps | Docker + Docker Compose + GitHub Actions | Entornos reproducibles, CI, pruebas automatizadas y despliegue controlado. |

## Arquitectura propuesta

El backend debe organizarse como una API modular en NestJS:

```text
src/
  app.module.ts
  common/
  config/
  auth/
  users/
  identity/
  devices/
  accounts/
  ledger/
  transactions/
  transfers/
  payments/
  cards/
  notifications/
  audit/
  admin/
```

## Modulos principales

### Mobile

- Registro de usuario.
- Verificacion de telefono mediante OTP.
- Captura de DNI.
- Captura facial.
- Login con PIN.
- Dashboard con saldo y movimientos.
- Transferencias.
- QR simulado.
- Tarjeta virtual.
- Centro de seguridad.

### Backend

- Autenticacion con JWT y Refresh Token.
- Control de roles con RBAC.
- Usuarios e identidad.
- Registro de dispositivos.
- Cuentas digitales simuladas.
- Ledger transaccional.
- Transferencias internas Quipupay.
- Pagos QR simulados.
- Tarjeta virtual simulada.
- Notificaciones.
- Auditoria.
- Panel administrativo.

### PostgreSQL

Debe almacenar datos estructurados y transaccionales:

- Usuarios.
- Identidades.
- Dispositivos.
- Cuentas.
- Transacciones.
- Movimientos de ledger.
- Beneficiarios.
- Tarjetas virtuales simuladas.
- Eventos de auditoria.
- Notificaciones.

No debe almacenar imagenes pesadas directamente. Para eso se utiliza Cloudflare R2.

Flyway es la fuente de verdad para la estructura SQL. Prisma no debe crear migraciones sobre la misma base; debe ejecutar `prisma db pull` despues de aplicar migraciones Flyway.

### Redis

Redis se usa para informacion temporal:

- Codigos OTP.
- Rate limiting.
- Intentos fallidos de login.
- Bloqueos temporales.
- Sesiones temporales.
- Idempotencia de operaciones criticas.

### Cloudflare R2

Cloudflare R2 se usa como almacenamiento de objetos para archivos e imagenes:

- Fotos del DNI.
- Selfies de verificacion.
- Evidencias del onboarding.
- Comprobantes simulados.
- Archivos generados por la plataforma.

El backend guarda en PostgreSQL solo la metadata del archivo:

- ID del objeto.
- Usuario asociado.
- Tipo de archivo.
- Estado.
- Fecha de carga.
- Hash o checksum.
- Ruta/clave interna del objeto.

### Resend

Resend se usa para correos transaccionales:

- Confirmacion de registro.
- Verificacion de correo.
- Recuperacion de acceso.
- Alerta de inicio de sesion.
- Notificacion de nuevo dispositivo.
- Cambio de PIN.
- Bloqueo de cuenta.
- Confirmacion de transferencia.

## Seguridad

Controles recomendados:

- JWT + Refresh Token.
- RBAC con roles `USER`, `ADMIN` y `AUDITOR`.
- PIN de 6 digitos.
- Teclado numerico dinamico.
- OTP con expiracion e intentos limitados.
- Rate limiting.
- Hash seguro de secretos.
- Validacion de entrada con DTOs.
- Auditoria de eventos criticos.
- Variables de entorno para secretos.
- No subir `.env` al repositorio.
- No almacenar PIN, tokens o claves en texto plano.
- No almacenar datos reales de tarjetas.
- No procesar dinero real.

## Gestion del proyecto

Quipupay se gestiona con:

- Scrum para desarrollo iterativo e incremental.
- Product Backlog.
- Sprint Backlog.
- Incrementos demostrables.
- Sprint Planning.
- Daily Scrum.
- Sprint Review.
- Sprint Retrospective.
- PMBOK como apoyo para alcance, cronograma, riesgos, interesados, calidad y seguimiento.
- CMMI v3.0 como referencia de mejora continua, trazabilidad, calidad y madurez de procesos.

## Justificacion de NestJS

NestJS es una buena eleccion para Quipupay porque:

- Usa TypeScript, igual que React Native.
- Permite arquitectura modular clara.
- Tiene buena integracion con Swagger/OpenAPI.
- Funciona bien con Prisma y PostgreSQL.
- Puede trabajar con Flyway como capa profesional de migraciones SQL.
- Facilita pruebas con Jest.
- Es rapido para construir un MVP academico serio.
- Mantiene una estructura profesional parecida a frameworks enterprise.

## Decision tecnica

El stack oficial recomendado para continuar el proyecto es:

```text
React Native + Expo Go + TypeScript
NestJS + TypeScript
PostgreSQL + Flyway + Prisma
Redis
Cloudflare R2
Resend
Swagger / OpenAPI
Jest
Docker + GitHub Actions
Scrum + PMBOK + CMMI v3.0
```
