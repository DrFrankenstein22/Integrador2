# Quipupay

Quipupay es una plataforma academica de banca digital tipo fintech, orientada a simular servicios financieros modernos mediante una aplicacion movil y una API REST segura.

El proyecto se desarrolla como MVP universitario, por lo que no opera como entidad financiera real, no procesa dinero real y no almacena datos reales de tarjetas bancarias.

## Objetivo

Construir una solucion demostrable con onboarding digital, validacion de identidad, autenticacion segura, cuenta digital simulada, ledger transaccional, transferencias, tarjeta virtual, auditoria y panel administrativo.

## Stack principal

### Mobile

- React Native
- Expo Go
- TypeScript

### Backend

- NestJS
- TypeScript
- PostgreSQL
- Flyway
- Prisma
- Redis
- Cloudflare R2
- Resend
- OpenAPI / Swagger
- Jest

### Panel administrativo

- React
- Vite
- TypeScript
- TanStack Query
- Vitest

### Arquitectura

- Monolito modular por dominios.
- API REST versionada.
- Separacion entre controladores, aplicacion, dominio e infraestructura.
- Ledger para trazabilidad financiera.
- Auditoria para eventos criticos.
- Pruebas unitarias desde el inicio.

## Estructura del repositorio

```text
backend/
  src/
    common/
    health/
    ledger/
    transactions/
    transfers/
  db/
    migration/
  test/

mobile/
  src/
    app/
      (auth)/
      (tabs)/
    api/
    components/
    constants/
    context/

admin-web/
  src/
    api/
    auth/
    components/
    layout/
    pages/

documentacion/
  1.0/
    gestion-git.md
    arquitectura-backend.md
    base-datos-flyway.md
    stack-tecnologico.md
    paleta-wcag.md
    mockups-wireframes/
```

## Ejecutar backend

```bash
cd backend
nvm use 20
npm ci
npm run start:dev
```

El backend se desarrolla y valida con Node.js 20.

## Ejecutar el panel administrativo

El panel es una aplicación web independiente y requiere Node.js 24 LTS. Usa la
API REST existente y conserva el token de acceso únicamente en memoria durante
la sesión.

```bash
cd admin-web
nvm use 24
npm ci
cp .env.example .env
npm run dev
```

La variable local necesaria es:

```dotenv
VITE_API_URL=http://localhost:3000/api/v1
```

El acceso reutiliza `POST /login` y valida la autorización con
`GET /admin/me`. Los roles `ADMIN` y `AUDITOR` solo pueden ser asignados
directamente en la base de datos por un operador autorizado. No existe ni debe
crearse un endpoint público de elevación de roles.

## Base de datos local

Flyway es la fuente de verdad de la estructura SQL. Prisma se usa como cliente tipado despues de aplicar migraciones e introspectar la base.

```bash
docker compose up -d postgres redis
cd backend
npm run db:migrate
npm run prisma:pull
npm run prisma:generate
```

## Ejecutar mobile

```bash
cd mobile
npm install
npx expo start
```

## Ejecutar pruebas

```bash
cd backend
nvm use 20
npm test
```

Para verificar el panel:

```bash
cd admin-web
nvm use 24
npm test
npm run lint
npm run build
```

## Endpoints iniciales

- `GET /api/v1/health`
- `GET /api/docs`

## Gestion del proyecto

El equipo trabaja con Scrum para el desarrollo iterativo e incremental, complementado con practicas alineadas a PMBOK para alcance, cronograma, riesgos, interesados, calidad y seguimiento.

Reglas de trabajo:

- Las mejoras se desarrollan por ramas.
- Los commits deben ser atomicos.
- La rama principal no recibe cambios directos.
- La integracion a la rama principal la realiza el Scrum Master.
- Las historias criticas deben incluir pruebas unitarias cuando tengan logica de negocio.

## Producto

El detalle de las pantallas de la app movil implementadas, la paleta/tipografia aplicada y las reglas de negocio simuladas esta en [`PRODUCT.md`](./PRODUCT.md).

## Documentacion

La documentacion formal del proyecto esta en:

```text
documentacion/1.0/
```

Incluye flujo Git, stack tecnologico, arquitectura backend, arquitectura de base de datos con Flyway, paleta de colores, accesibilidad WCAG y espacio para mockups/wireframes.
