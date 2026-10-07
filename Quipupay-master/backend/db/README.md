# Base de Datos

La base de datos de Quipupay se gestiona con Flyway sobre PostgreSQL.

## Principio

Flyway es la fuente de verdad de las migraciones. Prisma se usa como cliente tipado despues de ejecutar `prisma db pull`.

## Comandos

Desde `backend`:

```bash
npm run db:migrate
npm run db:info
npm run db:validate
npm run prisma:pull
npm run prisma:generate
```

## Estructura

```text
db/
  migration/
    V1__create_foundation_schemas.sql
    V2__seed_reference_data.sql
```

