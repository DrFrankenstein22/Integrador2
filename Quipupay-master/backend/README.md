# Quipupay Backend

API backend academica para Quipupay construida con NestJS y TypeScript.

## Stack

- NestJS
- TypeScript
- PostgreSQL
- Flyway
- Prisma
- Redis
- Cloudflare R2
- Resend
- Swagger / OpenAPI
- Jest

## Ejecutar

```bash
cd backend
npm install
npm run db:migrate
npm run prisma:pull
npm run prisma:generate
npm run start:dev
```

## Probar

```bash
cd backend
npm test
```

## Endpoints iniciales

- `GET /api/v1/health`
- `GET /api/docs`

## Servicios locales

Desde la raiz del repositorio:

```bash
docker compose up -d postgres redis
```

Esto levanta PostgreSQL y Redis. Flyway se ejecuta bajo demanda con los scripts de base de datos.

## Base de datos

Flyway es la fuente de verdad de la estructura SQL. Prisma se usa como cliente tipado despues de aplicar migraciones e introspectar la base.

```bash
npm run db:migrate
npm run db:info
npm run db:validate
npm run prisma:pull
npm run prisma:generate
```

## Modulos planificados

- `auth`: JWT, refresh token, PIN, roles y seguridad de sesion.
- `users`: usuarios y datos personales.
- `identity`: DNI, OTP, OCR y proveedor de identidad.
- `devices`: credenciales de dispositivo.
- `accounts`: cuenta digital simulada.
- `ledger`: movimientos debito/credito.
- `transfers`: transferencias internas Quipupay.
- `cards`: tarjeta virtual simulada.
- `notifications`: Resend y notificaciones operativas.
- `storage`: Cloudflare R2 para archivos e imagenes.
- `audit`: eventos criticos y trazabilidad.
- `admin`: supervision administrativa.
