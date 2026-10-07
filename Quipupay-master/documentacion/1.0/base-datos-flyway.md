# Arquitectura de Base de Datos y Flyway

## Proposito

Este documento define la arquitectura de base de datos de Quipupay. Debe usarse como fuente de referencia para implementar migraciones, modelos Prisma, servicios backend y pruebas relacionadas con persistencia.

Quipupay es una fintech academica simulada. La base de datos debe parecer seria y defendible, pero sin afirmar que opera como banco real, sin procesar dinero real y sin guardar datos reales de tarjetas o biometria sensible innecesaria.

## Decision Principal

La base de datos se gestiona con PostgreSQL y Flyway.

```text
Flyway SQL migrations
        |
        v
PostgreSQL
        |
        v
Prisma db pull
        |
        v
Prisma Client
        |
        v
NestJS Backend
```

Flyway es la fuente de verdad para la estructura de la base de datos. Prisma se utiliza como ORM/cliente tipado, no como herramienta principal de migraciones.

No se debe usar `prisma migrate` y Flyway al mismo tiempo para modificar la misma base de datos, porque eso crea dos fuentes de verdad.

## Esquemas PostgreSQL

La base se separa por dominios:

```text
auth
identity
users
devices
banking
ledger
transactions
cards
payments
files
notifications
risk
audit
admin
config
```

Esta separacion permite:

- ordenar responsabilidades por dominio;
- facilitar auditoria;
- aplicar permisos por esquema;
- mejorar mantenibilidad;
- explicar arquitectura profesional;
- preparar crecimiento futuro por modulos.

## Esquema `config`

Contiene catalogos y parametros del sistema.

Tablas principales:

- `config.currencies`
- `config.status_catalog`
- `config.system_parameters`

La tabla de monedas evita hardcodear `PEN` o `USD` en multiples tablas. La tabla `status_catalog` evita estados libres como `DONE`, `COMPLETE` o `COMPLETED` mezclados sin control.

## Esquema `users`

Gestiona usuarios y perfil personal.

Tablas principales:

- `users.users`
- `users.user_profiles`
- `users.user_contacts`

El usuario representa la identidad funcional dentro de Quipupay. Los datos personales extendidos se separan para no sobrecargar la tabla principal.

## Esquema `auth`

Gestiona autenticacion y autorizacion.

Tablas principales:

- `auth.roles`
- `auth.permissions`
- `auth.role_permissions`
- `auth.user_roles`
- `auth.refresh_tokens`
- `auth.pin_credentials`
- `auth.login_attempts`
- `auth.mfa_methods`
- `auth.password_history`
- `auth.security_events`

Reglas clave:

- No almacenar PIN en texto plano.
- No almacenar refresh tokens en texto plano.
- Guardar hashes y metadatos minimos.
- Registrar intentos fallidos.
- Bloqueo temporal controlado por backend.
- Mantener eventos de seguridad auditables.

## Esquema `identity`

Gestiona verificacion de identidad, DNI, OTP, documentos y biometria facial.

Tablas principales:

- `identity.identity_profiles`
- `identity.otp_challenges`
- `identity.document_captures`
- `identity.identity_provider_checks`
- `identity.biometric_consents`
- `identity.biometric_enrollments`
- `identity.liveness_checks`
- `identity.biometric_verification_attempts`

La biometria no debe tratarse como contrasena. Debe ser parte de un flujo multifactor con dispositivo, PIN, sesion y auditoria.

## Biometria Facial e IA Local

El reconocimiento facial se ejecuta principalmente en el dispositivo movil. La base de datos no debe almacenar una selfie cruda como campo binario ni usar el rostro como secreto.

La imagen del DNI o selfie puede almacenarse en Cloudflare R2 y PostgreSQL solo conserva metadata:

- bucket;
- object key;
- checksum;
- mime type;
- tamano;
- usuario relacionado;
- tipo documental;
- estado;
- fecha de carga.

Para IA facial se guardan resultados tecnicos y auditables:

- `quality_score`;
- `liveness_score`;
- `match_score`;
- `threshold_used`;
- `model_version`;
- `decision`;
- `reason_code`;
- `created_at`.

Tambien se registra consentimiento:

- tipo de consentimiento;
- version de politica;
- fecha/hora;
- IP;
- user agent;
- estado.

Esto permite defender privacidad, minimizacion de datos, trazabilidad y control.

## Esquema `devices`

Gestiona dispositivos y sesiones.

Tablas principales:

- `devices.devices`
- `devices.device_credentials`
- `devices.device_sessions`

Una app financiera debe saber:

- que dispositivo inicio sesion;
- cuando fue el ultimo acceso;
- version de app;
- sistema operativo;
- IP;
- sesion revocada o activa;
- credencial criptografica asociada.

## Esquema `banking`

Gestiona cuentas digitales simuladas, limites y beneficiarios.

Tablas principales:

- `banking.accounts`
- `banking.account_limits`
- `banking.beneficiaries`

Las cuentas usan moneda desde `config.currencies`. Los limites permiten definir maximos diarios/mensuales y reglas por cuenta.

## Esquemas `transactions` y `ledger`

Estos esquemas son el centro del sistema financiero simulado.

Tablas principales:

- `transactions.transactions`
- `transactions.transfers`
- `transactions.idempotency_keys`
- `ledger.ledger_entries`
- `ledger.account_balance_snapshots`

No se debe manejar el saldo solo con:

```text
accounts.balance = accounts.balance + 300
```

Ese enfoque pierde trazabilidad.

El flujo correcto es:

```text
transaction
    |
    v
ledger_entries
    |
    v
account_balance_snapshot
```

Ejemplo de transferencia de S/300:

```text
transactions.transfers
id: TX001
status: COMPLETED

ledger.ledger_entries
Cuenta A: DEBIT  300
Cuenta B: CREDIT 300
```

El saldo se puede calcular como:

```text
saldo = creditos - debitos
```

Los snapshots sirven para rendimiento y conciliacion.

Esto permite explicar:

- doble partida contable;
- atomicidad;
- consistencia;
- trazabilidad;
- conciliacion;
- reversos;
- idempotencia.

## Reversos

Las transacciones historicas completadas no se editan. Si hay error, se crea una nueva transaccion de reverso vinculada a la transaccion original.

Campos importantes:

- `reversal_of_transaction_id`;
- `reversed_by_transaction_id`;
- `reason_code`;
- `audit_event`.

## Esquema `cards`

Gestiona tarjeta virtual simulada.

Tablas principales:

- `cards.virtual_cards`
- `cards.card_events`

Reglas:

- No almacenar PAN real.
- No almacenar CVV real.
- Usar datos ficticios o tokenizados para demostracion.
- Guardar solo numero enmascarado.
- Registrar bloqueo/desbloqueo como eventos.

## Esquema `payments`

Gestiona QR y comprobantes simulados.

Tablas principales:

- `payments.qr_payment_requests`
- `payments.payment_receipts`

Los pagos se relacionan con `transactions.transactions` y deben producir movimientos en ledger cuando correspondan.

## Esquema `files`

Gestiona metadata de archivos guardados en Cloudflare R2.

Tabla principal:

- `files.stored_objects`

PostgreSQL no almacena imagenes pesadas. Solo almacena metadata y referencias.

## Esquema `notifications`

Gestiona notificaciones y correos.

Tablas principales:

- `notifications.notification_events`
- `notifications.email_events`

Resend se usa para correos transaccionales:

- verificacion;
- recuperacion;
- alerta de nuevo dispositivo;
- cambio de PIN;
- bloqueo de cuenta;
- confirmacion de transferencia.

## Esquema `risk`

Gestiona reglas y eventos antifraude.

Tablas principales:

- `risk.risk_rules`
- `risk.risk_events`
- `risk.risk_scores`

La primera version puede usar reglas deterministicas. Machine learning queda como evolucion futura.

## Esquema `audit`

Gestiona auditoria transversal.

Tabla principal:

- `audit.audit_events`

Cada evento critico debe incluir:

- actor;
- accion;
- entidad;
- correlation ID;
- resultado;
- IP si aplica;
- user agent si aplica;
- metadata no sensible;
- fecha/hora.

No se deben registrar secretos, PIN, tokens ni biometria cruda.

## Esquema `admin`

Gestiona acciones administrativas.

Tabla principal:

- `admin.admin_actions`

Cada accion administrativa debe quedar vinculada a un auditor o administrador y a un evento de auditoria.

## Indices Recomendados

Consultas frecuentes:

- historial de movimientos por cuenta;
- transacciones por usuario;
- auditoria por entidad;
- eventos de seguridad por usuario;
- sesiones por dispositivo;
- archivos por usuario;
- notificaciones pendientes.

Indices clave:

```text
transactions.transactions(user_id, created_at)
transactions.transactions(status_code, created_at)
ledger.ledger_entries(account_id, created_at)
audit.audit_events(entity_type, entity_id, created_at)
auth.login_attempts(user_id, created_at)
devices.device_sessions(device_id, last_activity_at)
notifications.notification_events(user_id, status_code, created_at)
```

## Migraciones Flyway

Estructura recomendada:

```text
backend/db/migration/
  V1__create_foundation_schemas.sql
  V2__seed_reference_data.sql
```

Futuras migraciones:

```text
V3__add_authentication_tokens.sql
V4__add_identity_onboarding_indexes.sql
V5__add_transfer_constraints.sql
V6__add_audit_partitioning.sql
```

## Comandos

Desde `backend`:

```bash
npm run db:migrate
npm run db:info
npm run db:validate
npm run prisma:pull
npm run prisma:generate
```

## Reglas que No se Deben Romper

- Flyway es la fuente de verdad de migraciones.
- Prisma no debe crear migraciones sobre la misma base.
- No almacenar imagenes pesadas en PostgreSQL.
- No almacenar biometria cruda como secreto.
- No almacenar PIN o tokens en texto plano.
- No editar transacciones historicas completadas.
- Usar reversos para corregir operaciones.
- Toda operacion critica debe tener auditoria.
- Toda operacion financiera debe tener ledger.
- Todo endpoint critico debe ser testeable.

## Evaluacion del Diseno

Con monedas, catalogos de estados, sesiones de dispositivos, consentimiento biometrico, eventos de seguridad y estrategia de reversos, esta arquitectura queda fuerte para presentar Quipupay como una plataforma financiera educativa con diseno profesional.
