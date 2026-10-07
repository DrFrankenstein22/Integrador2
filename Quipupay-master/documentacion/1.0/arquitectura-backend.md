# Arquitectura Backend

## Enfoque

El backend de Quipupay se plantea como una API REST modular construida con NestJS y TypeScript. Este enfoque permite mantener una estructura profesional por dominios, avanzar rapido con el MVP y conservar buena separacion de responsabilidades.

## Modulos

```text
src/
├── app.module.ts
├── common/
├── config/
├── health/
├── auth/
├── users/
├── identity/
├── devices/
├── accounts/
├── ledger/
├── transactions/
├── transfers/
├── payments/
├── cards/
├── notifications/
├── audit/
└── admin/
```

## Principios

- Separacion por dominio funcional.
- Logica de negocio testeable sin depender de controladores.
- API REST versionada bajo `/api/v1`.
- Validaciones desde el borde de entrada mediante DTOs.
- Ledger para movimientos financieros simulados.
- Auditoria para eventos criticos.
- Seguridad por defecto.
- Configuracion mediante variables de entorno.
- Documentacion automatica con Swagger/OpenAPI.

## Componentes tecnicos

- NestJS para API modular.
- Prisma para acceso a datos y migraciones.
- PostgreSQL como base de datos principal.
- Redis para OTP, rate limiting, sesiones temporales e idempotencia.
- Cloudflare R2 para imagenes y archivos.
- Resend para correos transaccionales.
- Jest para pruebas unitarias e integracion.
- Docker para entorno reproducible.

## Modulos prioritarios del MVP

1. `health`: verificacion del estado de la API.
2. `auth`: login, JWT, refresh token, PIN y roles.
3. `users`: datos principales del usuario.
4. `identity`: DNI, OTP, OCR, validacion y estados de identidad.
5. `devices`: registro seguro de dispositivos.
6. `accounts`: cuentas digitales simuladas.
7. `ledger`: movimientos debito/credito.
8. `transfers`: transferencias internas Quipupay.
9. `audit`: trazabilidad de eventos criticos.
10. `admin`: supervision de usuarios y operaciones.

## Modulos implementados

| Modulo | Endpoints | Notas |
| --- | --- | --- |
| `health` | `GET /health` | — |
| `auth` | `POST /register`, `POST /login` | PIN con bcrypt en `auth.pin_credentials`; `JwtAuthGuard` + `@CurrentUser()` protegen el resto de la API |
| `identity` | `GET /identity/dni/:dni` | Consulta a ApiPeru (requiere `APIPERU_TOKEN`) |
| `products` | `GET /products`, `GET /products/:code` | Catalogo estatico (ahorros / sueldo / dolares) con tarifario y TREA |
| `accounts` | `POST /accounts`, `GET /accounts`, `GET /accounts/:id` | Apertura verifica PIN, aplica la regla HU03 (max 3 del mismo producto), genera N° de cuenta + CCI y siembra el abono inicial en `ledger` |
| `movements` | `GET /accounts/:id/movements`, `GET /movements/:id`, `POST /accounts/:id/demo-movements` | Movimientos paginados por cursor con filtros de tipo, texto y rango de fechas; comprobante; seed de demo solo en desarrollo |
| `kyc` | `POST /kyc/session`, `POST /kyc/challenge`, `POST /kyc/document`, `POST /kyc/selfie`, `GET /kyc/result/:sessionKey` | Verificación biométrica antifraude: challenge de liveness activo aleatorio, heurísticas de imagen (`sharp`), motor de riesgo multi-señal, proveedores desacoplados (`KYC_PROVIDER=mock`/`aws`). Ver `kyc-antifraude.md`. |
| `transfers` | (dominio, sin controlador) | HU05 pendiente |
