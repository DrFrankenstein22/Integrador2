# Quipupay Audit and Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe business-event auditing, permission-protected administrative query endpoints, and a separate web dashboard for auditors and administrators.

**Architecture:** A global NestJS interceptor assigns correlation IDs and emits technical request logs. Selected mutations opt into PostgreSQL audit persistence through a decorator, while an administrative read service normalizes `audit.audit_events` and `auth.login_attempts`; a separate React/Vite SPA consumes only permission-protected `/api/v1/admin/*` routes.

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Jest 29, Node.js 20 for `backend/`; React, Vite, TypeScript, TanStack Query, React Router, Vitest, Node.js 24 LTS for `admin-web/`.

**Spec:** `docs/superpowers/specs/2026-09-09-auditoria-panel-administrativo-design.md`

**Verified baseline:** On 2026-09-09, `backend/` installed successfully with
Node.js 20.19.6 and passed 14 Jest suites / 65 tests before implementation.

## Runtime commands

- Before backend commands, run `nvm use 20`; CI uses Node.js 20.
- Before admin panel commands, run `nvm use 24`; `admin-web/.nvmrc` and `engines.node` enforce Node.js 24.
- Install and test each application from its own directory. There is no root workspace and no shared `node_modules`.

## Security constraints

- Never serialize request bodies, response bodies, authorization headers, PINs, OTPs, JWTs, DNI images, videos, buffers, credential hashes, or multipart content into logs or audit metadata.
- Persist only metadata paths explicitly declared by `@AuditEvent`.
- Keep all administrative endpoints read-only and protected by both JWT authentication and `audit:read`.
- Keep `mobile/` unchanged.
- Do not add CloudWatch, deployment automation, queues, a second admin authentication mechanism, or schema changes to `audit.audit_events`.
- Audit persistence is fail-open for this academic MVP: record the audit failure technically, then preserve the original business response or exception.

---

## File map

### Backend files to create

- `backend/src/audit/audit-request.ts` — request type plus correlation helpers.
- `backend/src/audit/audit-event.decorator.ts` — opt-in business-event metadata.
- `backend/src/audit/audit-event.catalog.ts` — stable codes and Spanish display descriptions.
- `backend/src/audit/audit.types.ts` — normalized administrative response contracts.
- `backend/src/audit/audit.interceptor.ts` — global technical logging and decorated-event persistence.
- `backend/src/audit/audit.service.ts` — persistence, normalization, filters, pagination, summary, and user activity.
- `backend/src/audit/audit-permissions.guard.ts` — database-backed permission check.
- `backend/src/audit/require-permission.decorator.ts` — permission metadata.
- `backend/src/audit/audit.controller.ts` — read-only administrative API.
- `backend/src/audit/audit.module.ts` — module and global interceptor registration.
- `backend/src/audit/dto/audit-query.dto.ts` — validated event query parameters.
- `backend/src/audit/dto/date-range-query.dto.ts` — validated summary date range.
- `backend/src/audit/dto/user-query.dto.ts` — validated user search parameters.
- `backend/src/audit/audit-cursor.ts` — opaque, validated merged-source cursor.
- `backend/test/audit.interceptor.spec.ts` — correlation, logging, persistence, and sanitization tests.
- `backend/test/audit-event.catalog.spec.ts` — description mapping tests.
- `backend/test/audit-permissions.guard.spec.ts` — permission matrix tests.
- `backend/test/audit.service.spec.ts` — merge, filters, cursor, summary, and masking tests.
- `backend/test/audit.controller.spec.ts` — controller delegation and guard metadata tests.
- `backend/test/auth-role-assignment.spec.ts` — default `USER` assignment test.

### Backend files to modify

- `backend/src/app.module.ts` — import `AuditModule` once.
- `backend/src/auth/auth.controller.ts` — annotate registration.
- `backend/src/auth/auth.service.ts` — assign `USER` in the existing registration transaction.
- `backend/src/accounts/accounts.controller.ts` — annotate account opening.

### Admin panel files to create

- `admin-web/.nvmrc`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `index.html` — Node 24 Vite application scaffold.
- `admin-web/src/main.tsx`, `App.tsx`, `styles.css` — application entry, routes, and design tokens.
- `admin-web/src/api/client.ts`, `types.ts`, `audit-api.ts` — typed API boundary.
- `admin-web/src/auth/AuthContext.tsx`, `ProtectedRoute.tsx` — in-memory JWT session and permission bootstrap.
- `admin-web/src/layout/AdminLayout.tsx` — navigation shell.
- `admin-web/src/pages/LoginPage.tsx`, `DashboardPage.tsx`, `EventsPage.tsx`, `EventDetailPage.tsx`, `UsersPage.tsx`, `UserActivityPage.tsx` — approved screens.
- `admin-web/src/components/MetricCard.tsx`, `AuditFilters.tsx`, `EventTable.tsx`, `StatusBadge.tsx`, `AsyncState.tsx` — focused reusable UI.
- `admin-web/src/test/setup.ts`, `api/client.test.ts`, `auth/AuthContext.test.tsx`, `pages/DashboardPage.test.tsx`, `pages/EventsPage.test.tsx`, `pages/UserActivityPage.test.tsx` — frontend verification.

### Repository files to modify

- `.github/workflows/ci.yml` — add an independent Node 24 admin job.
- `.gitignore` — ignore `.superpowers/` visual-companion artifacts.
- `README.md` — document local admin startup and runtime separation.

---

## Task 1: Global correlation and technical request logging

**Files:**

- Create: `backend/src/audit/audit-request.ts`
- Create: `backend/src/audit/audit.interceptor.ts`
- Create: `backend/src/audit/audit.module.ts`
- Create: `backend/test/audit.interceptor.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**

- Export `AuditRequest extends Request` with optional `user` and required-once-intercepted `correlationId`.
- Export `resolveCorrelationId(value: unknown): string`.
- Export injectable `AuditInterceptor implements NestInterceptor`.
- At this task, the interceptor accepts no business-event writer; persistence is added in Task 2.

- [ ] **Step 1: Write failing correlation and logging tests**

Create request/response/context doubles and cover a valid incoming UUID, an invalid incoming value, a success response, and an exception. Assert that no request body or authorization value appears in the logger call.

```ts
expect(response.setHeader).toHaveBeenCalledWith('X-Correlation-ID', VALID_UUID);
expect(logger.log).toHaveBeenCalledWith(
  expect.objectContaining({
    correlationId: VALID_UUID,
    method: 'GET',
    route: '/api/v1/accounts',
    statusCode: 200,
  }),
);
expect(JSON.stringify(logger.log.mock.calls)).not.toContain('Bearer secret');
expect(JSON.stringify(logger.log.mock.calls)).not.toContain('135790');
```

- [ ] **Step 2: Run the new test and confirm the missing implementation failure**

Run:

```bash
cd backend
nvm use 20
npm test -- --runInBand test/audit.interceptor.spec.ts
```

Expected: FAIL because `audit-request.ts` and `AuditInterceptor` do not exist.

- [ ] **Step 3: Implement request typing and correlation validation**

Use `randomUUID()` and a strict UUID expression. Treat header arrays and malformed strings as absent.

```ts
export function resolveCorrelationId(value: unknown): string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : randomUUID();
}
```

- [ ] **Step 4: Implement the technical-only interceptor**

Use `tap` for successful responses and `catchError` for failures. Log an object containing only timestamp, correlation ID, method, route template or path, status, duration, actor ID, normalized IP, user-agent, and exception name. Rethrow the original exception unchanged.

```ts
const startedAt = Date.now();
request.correlationId = resolveCorrelationId(request.headers['x-correlation-id']);
response.setHeader('X-Correlation-ID', request.correlationId);

return next.handle().pipe(
  tap(() => this.logRequest(request, response.statusCode, Date.now() - startedAt)),
  catchError((error: unknown) => {
    this.logRequest(request, httpStatus(error), Date.now() - startedAt, error);
    return throwError(() => error);
  }),
);
```

- [ ] **Step 5: Register the interceptor globally through `AuditModule`**

```ts
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AuditModule {}
```

Import `AuditModule` once in `AppModule`; do not call `useGlobalInterceptors()` in `main.ts`.

- [ ] **Step 6: Run focused and full backend verification**

```bash
npm test -- --runInBand test/audit.interceptor.spec.ts
npm test -- --runInBand
npm run lint
npm run build
```

Expected: new test passes; all existing 65 tests remain green; lint and build exit zero.

- [ ] **Step 7: Commit Task 1**

```bash
git add backend/src/audit/audit-request.ts backend/src/audit/audit.interceptor.ts backend/src/audit/audit.module.ts backend/src/app.module.ts backend/test/audit.interceptor.spec.ts
git commit -m "feat(audit): add global request tracing"
```

---

## Task 2: Decorated business-event persistence and display catalog

**Files:**

- Create: `backend/src/audit/audit-event.decorator.ts`
- Create: `backend/src/audit/audit-event.catalog.ts`
- Create: `backend/src/audit/audit.types.ts`
- Create: `backend/src/audit/audit.service.ts`
- Create: `backend/test/audit-event.catalog.spec.ts`
- Modify: `backend/src/audit/audit.interceptor.ts`
- Modify: `backend/src/audit/audit.module.ts`
- Modify: `backend/test/audit.interceptor.spec.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/accounts/accounts.controller.ts`

**Interfaces:**

- Export `AUDIT_EVENT_METADATA` and `AuditEvent(options)`.
- Export `AuditEventOptions` with `eventType`, optional `actorResponsePath`,
  optional entity response path, and an allowlisted metadata-path map. Without
  `actorResponsePath`, the interceptor uses `request.user.id`.
- Export `describeAuditEvent(eventType, metadata, result): { title: string; description: string }`.
- Export `AuditRecordInput` from `audit.types.ts`; it contains only
  `actorUserId`, `eventType`, `entityType`, `entityId`, `correlationId`,
  `result`, `ipAddress`, `userAgent`, and sanitized scalar `metadata`.
- Export `AuditService.record(input: AuditRecordInput): Promise<void>`.
- Inject `Reflector` and `AuditService` into `AuditInterceptor`.

- [ ] **Step 1: Write failing decorator, catalog, and persistence tests**

Cover:

- An undecorated handler produces no Prisma audit write.
- `USER_REGISTERED` reads actor ID from `response.user.id`.
- `ACCOUNT_OPENED` reads entity ID and allowlisted `productCode`/`currency` from the response.
- A failed decorated handler records `FAILURE` without serializing the body.
- A Prisma write failure is logged and does not replace the success or exception.
- Catalog descriptions render known values and safely fall back for unknown codes.

```ts
expect(prisma.auditEvent.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    actorUserId: 'user-1',
    eventType: 'ACCOUNT_OPENED',
    entityType: 'account',
    entityId: 'account-1',
    correlationId: VALID_UUID,
    result: 'SUCCESS',
    metadata: { productCode: 'AHORROS', currency: 'PEN' },
  }),
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
npm test -- --runInBand test/audit.interceptor.spec.ts test/audit-event.catalog.spec.ts
```

Expected: FAIL on missing decorator, catalog, and persistence behavior.

- [ ] **Step 3: Implement decorator metadata and safe path extraction**

Use `SetMetadata`. Implement a local dot-path reader that returns only scalar
string/number/boolean/null values; never accept arbitrary objects or arrays.

```ts
export const AuditEvent = (options: AuditEventOptions) =>
  SetMetadata(AUDIT_EVENT_METADATA, options);
```

- [ ] **Step 4: Implement the initial event catalog**

Support `USER_REGISTERED`, `ACCOUNT_OPENED`, `KYC_MATERIALIZED`,
`LOGIN_SUCCEEDED`, and `LOGIN_FAILED`. Map unknown codes to the title equal to
the code and the description `Evento registrado por Quipupay`.

- [ ] **Step 5: Implement `AuditService.record()` and connect the interceptor**

Persist via `prisma.auditEvent.create`. Await the write before emitting a
successful decorated response. Wrap persistence failure inside the interceptor,
log it with the correlation/event identifiers, and return the original value.
On a business exception, attempt a `FAILURE` audit write and always rethrow the
original exception.

- [ ] **Step 6: Annotate only the approved existing mutations**

Registration:

```ts
@AuditEvent({ eventType: 'USER_REGISTERED', actorResponsePath: 'user.id' })
@Post('register')
```

Account opening:

```ts
@AuditEvent({
  eventType: 'ACCOUNT_OPENED',
  entityType: 'account',
  entityIdResponsePath: 'id',
  metadataResponsePaths: { productCode: 'productCode', currency: 'currency' },
})
@Post()
```

Do not decorate login because `auth.login_attempts` is its source. Do not
decorate KYC because `KycService.materialize()` already writes
`KYC_MATERIALIZED`.

- [ ] **Step 7: Run focused and full backend verification**

```bash
npm test -- --runInBand test/audit.interceptor.spec.ts test/audit-event.catalog.spec.ts
npm test -- --runInBand
npm run lint
npm run build
```

- [ ] **Step 8: Commit Task 2**

```bash
git add backend/src/audit backend/src/auth/auth.controller.ts backend/src/accounts/accounts.controller.ts backend/test/audit.interceptor.spec.ts backend/test/audit-event.catalog.spec.ts
git commit -m "feat(audit): persist decorated business events"
```

---

## Task 3: Default role assignment and database-backed permission guard

**Files:**

- Create: `backend/src/audit/require-permission.decorator.ts`
- Create: `backend/src/audit/audit-permissions.guard.ts`
- Create: `backend/test/audit-permissions.guard.spec.ts`
- Create: `backend/test/auth-role-assignment.spec.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/audit/audit.module.ts`

**Interfaces:**

- Export `REQUIRED_PERMISSION_METADATA` and `RequirePermission(code: string)`.
- Export injectable `AuditPermissionsGuard implements CanActivate`.
- The guard reads `request.user.id`, loads permissions from Prisma, and throws
  `ForbiddenException` when the permission is absent.

- [ ] **Step 1: Write failing permission matrix tests**

```ts
it.each([
  ['USER', false],
  ['AUDITOR', true],
  ['ADMIN', true],
])('checks audit:read for %s', async (role, allowed) => {
  prisma.userRole.findMany.mockResolvedValue(roleRows(role));
  if (allowed) await expect(guard.canActivate(context)).resolves.toBe(true);
  else await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
});
```

Also assert missing `request.user` is rejected and an endpoint without
permission metadata is rejected by default rather than silently opened.

- [ ] **Step 2: Write the failing default-role transaction test**

Mock the existing registration transaction. Require `tx.role.findUnique({ where:
{ code: 'USER' } })` and `tx.userRole.create({ data: { userId, roleId } })` before
the transaction completes.

- [ ] **Step 3: Run both new tests and confirm failure**

```bash
npm test -- --runInBand test/audit-permissions.guard.spec.ts test/auth-role-assignment.spec.ts
```

- [ ] **Step 4: Implement the permission decorator and guard**

Use `Reflector.getAllAndOverride()` across handler and controller. Query roles
and nested permission codes for the authenticated user. Do not accept roles or
permissions from request headers or the JWT payload.

- [ ] **Step 5: Assign `USER` inside the registration transaction**

After creating the user and before returning it, find the seeded `USER` role and
create the `UserRole`. Throw a clear internal configuration error if the seeded
role is missing so registration cannot create an unclassified account.

```ts
const role = await tx.role.findUnique({ where: { code: 'USER' } });
if (!role) throw new InternalServerErrorException('El rol USER no está configurado');
await tx.userRole.create({ data: { userId: createdUser.id, roleId: role.id } });
```

- [ ] **Step 6: Run focused and full backend verification**

```bash
npm test -- --runInBand test/audit-permissions.guard.spec.ts test/auth-role-assignment.spec.ts
npm test -- --runInBand
npm run lint
npm run build
```

- [ ] **Step 7: Commit Task 3**

```bash
git add backend/src/audit backend/src/auth/auth.service.ts backend/test/audit-permissions.guard.spec.ts backend/test/auth-role-assignment.spec.ts
git commit -m "feat(auth): enforce audit permissions"
```

---

## Task 4: Normalized administrative audit queries

**Files:**

- Create: `backend/src/audit/dto/audit-query.dto.ts`
- Create: `backend/src/audit/dto/date-range-query.dto.ts`
- Create: `backend/src/audit/dto/user-query.dto.ts`
- Create: `backend/src/audit/audit-cursor.ts`
- Modify: `backend/src/audit/audit.types.ts`
- Create: `backend/test/audit.service.spec.ts`
- Modify: `backend/src/audit/audit.service.ts`

**Interfaces:**

```ts
export type ActivitySource = 'audit' | 'login';

export type AdminActivityEvent = {
  source: ActivitySource;
  id: string;
  eventType: string;
  title: string;
  description: string;
  result: string;
  actor: { id: string; displayName: string; maskedDni: string } | null;
  entity: { type: string; id: string } | null;
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type ActivityPage = {
  items: AdminActivityEvent[];
  nextCursor: string | null;
};

export type AuditSummary = {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  activeUsers: number;
  from: string;
  to: string;
};

export type AdminUserSummary = {
  id: string;
  displayName: string;
  maskedDni: string;
  status: string;
  lastActivityAt: string | null;
};

export type AdminUserPage = {
  items: AdminUserSummary[];
  nextCursor: string | null;
};

export type AdminIdentity = {
  id: string;
  displayName: string;
  maskedDni: string;
  roles: string[];
  permissions: string[];
};

export type UserActivityPage = {
  user: AdminUserSummary & {
    recentIpAddress: string | null;
    eventCount: number;
  };
  activity: ActivityPage;
};
```

- [ ] **Step 1: Write failing cursor and normalization tests**

Cover cursor round-trip, malformed cursor rejection, DNI masking, name fallback,
known and unknown catalog descriptions, and conversion of both Prisma source
rows to `AdminActivityEvent`.

```ts
expect(maskDni('12345678')).toBe('••••5678');
expect(normalizeLogin(successRow).eventType).toBe('LOGIN_SUCCEEDED');
expect(normalizeLogin(failureRow).eventType).toBe('LOGIN_FAILED');
```

- [ ] **Step 2: Write failing merged-order and filter tests**

Return interleaved audit/login fixtures. Assert newest-first order, stable
tie-breaking by source and ID, `limit`, `nextCursor`, event type mapping, actor,
result, dates, and correlation filters. For login rows, correlation ID remains
`null` because `auth.login_attempts` has no such column.

- [ ] **Step 3: Write failing summary and user activity tests**

Assert totals include both sources, unique actors ignore null actors, exact DNI
search returns only masked output, and `/users/:id/activity` never returns PIN,
hash, token, or biometric fields.

- [ ] **Step 4: Run the service test and confirm failure**

```bash
npm test -- --runInBand test/audit.service.spec.ts
```

- [ ] **Step 5: Implement DTO validation**

Use `class-transformer` and `class-validator`:

```ts
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)
limit = 25;

@IsOptional()
@IsISO8601({ strict: true })
from?: string;
```

Reject unknown sources, invalid UUIDs, reversed date ranges, and malformed
cursors with `BadRequestException`.

- [ ] **Step 6: Implement an opaque stable cursor**

Encode `{ createdAt, source, id }` as base64url JSON. Decode with an exact shape
check. Each source query may fetch `limit + 1` records at or before the cursor
timestamp; merge, apply the tuple comparator `(createdAt desc, source asc, id
desc)`, slice to `limit`, and encode the final returned tuple when more rows
exist.

- [ ] **Step 7: Implement normalized queries in `AuditService`**

Use explicit Prisma `select` objects for users, profiles, audit fields, login
fields, and device platform. Do not return Prisma objects directly. Implement:

```ts
getSummary(query: DateRangeQueryDto): Promise<AuditSummary>;
listEvents(query: AuditQueryDto): Promise<ActivityPage>;
getEvent(source: ActivitySource, id: string): Promise<AdminActivityEvent>;
listUsers(query: UserQueryDto): Promise<AdminUserPage>;
getUserActivity(userId: string, query: AuditQueryDto): Promise<UserActivityPage>;
getAdminIdentity(userId: string): Promise<AdminIdentity>;
```

- [ ] **Step 8: Run focused and full backend verification**

```bash
npm test -- --runInBand test/audit.service.spec.ts
npm test -- --runInBand
npm run lint
npm run build
```

- [ ] **Step 9: Commit Task 4**

```bash
git add backend/src/audit backend/test/audit.service.spec.ts
git commit -m "feat(audit): add administrative activity queries"
```

---

## Task 5: Permission-protected administrative API

**Files:**

- Create: `backend/src/audit/audit.controller.ts`
- Create: `backend/test/audit.controller.spec.ts`
- Modify: `backend/src/audit/audit.module.ts`

**Interfaces:**

- Controller prefix: `admin`.
- Controller-level guards: `JwtAuthGuard`, then `AuditPermissionsGuard`.
- Controller-level permission: `@RequirePermission('audit:read')`.
- Routes exactly match the design spec.

- [ ] **Step 1: Write failing controller delegation tests**

Instantiate the controller with a mocked `AuditService`. Cover:

```text
GET admin/me
GET admin/audit/summary
GET admin/audit/events
GET admin/audit/events/:source/:id
GET admin/users
GET admin/users/:id/activity
```

Assert route metadata includes both guards and `audit:read`, and assert each
handler delegates validated arguments without reshaping service output.

- [ ] **Step 2: Run the controller test and confirm failure**

```bash
npm test -- --runInBand test/audit.controller.spec.ts
```

- [ ] **Step 3: Implement the controller**

Use Swagger tags, bearer auth, operation descriptions, parameter decorators,
and the DTOs from Task 4. `/admin/me` returns only user ID, masked DNI,
display name, role codes, and permission codes obtained through an explicit
`AuditService.getAdminIdentity(user.id)` select.

- [ ] **Step 4: Register the controller and providers in `AuditModule`**

Keep `PrismaModule` global as it is; do not introduce circular imports or export
the administrative controller logic to feature modules.

- [ ] **Step 5: Run focused and full backend verification**

```bash
npm test -- --runInBand test/audit.controller.spec.ts
npm test -- --runInBand
npm run lint
npm run build
```

- [ ] **Step 6: Commit Task 5**

```bash
git add backend/src/audit backend/test/audit.controller.spec.ts
git commit -m "feat(audit): expose read-only admin API"
```

---

## Task 6: Node 24 admin application scaffold and protected session

**Files:**

- Create: all scaffold/config files listed in the admin file map.
- Create: `admin-web/src/api/client.ts`
- Create: `admin-web/src/api/types.ts`
- Create: `admin-web/src/auth/AuthContext.tsx`
- Create: `admin-web/src/auth/ProtectedRoute.tsx`
- Create: `admin-web/src/pages/LoginPage.tsx`
- Create: `admin-web/src/test/setup.ts`
- Create: `admin-web/src/api/client.test.ts`
- Create: `admin-web/src/auth/AuthContext.test.tsx`
- Modify: `.gitignore`

**Interfaces:**

- Environment: `VITE_API_URL=http://localhost:3000/api/v1`.
- `apiFetch<T>(path, init): Promise<T>` adds the in-memory bearer token.
- `AuthContext` exposes `status`, `admin`, `login(dni, pin)`, and `logout()`.
- The token is never written to `localStorage` or `sessionStorage`.

- [ ] **Step 1: Verify Node 24 and create the Vite React TypeScript scaffold**

```bash
nvm use 24
node --version
npm create vite@latest admin-web -- --template react-ts
cd admin-web
npm install
npm install react-router-dom @tanstack/react-query
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `node --version` begins with `v24.` and `package-lock.json` is created
inside `admin-web/`.

- [ ] **Step 2: Pin the admin runtime and test environment**

Set `admin-web/.nvmrc` to `24`. Add this exact package metadata:

```json
{
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

Configure Vitest with `environment: 'jsdom'` and
`setupFiles: ['./src/test/setup.ts']`. Add `.superpowers/` to the root
`.gitignore`; do not commit the generated brainstorming directory.

- [ ] **Step 3: Write failing API and authentication tests**

Cover bearer injection, non-2xx `ApiError`, successful login followed by
`/admin/me`, denied `403`, logout, and the absence of browser-storage writes.

```ts
expect(fetch).toHaveBeenLastCalledWith(
  expect.stringContaining('/admin/me'),
  expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
);
expect(localStorage.getItem('token')).toBeNull();
```

- [ ] **Step 4: Run tests and confirm failure**

```bash
npm test -- src/api/client.test.ts src/auth/AuthContext.test.tsx
```

- [ ] **Step 5: Implement the typed API client and in-memory auth context**

Keep the token in module/context memory. On login, call existing `POST /login`,
then `GET /admin/me`. Clear the token on `/admin/me` `401` or `403` and present
the approved Spanish access message.

- [ ] **Step 6: Implement routes and protected layout boundary**

Use React Router. Unauthenticated users see `/login`; authenticated users see
the `AdminLayout` outlet. Unknown routes redirect to `/`.

- [ ] **Step 7: Run admin verification**

```bash
npm test
npm run lint
npm run build
```

- [ ] **Step 8: Commit Task 6**

```bash
git add .gitignore admin-web
git commit -m "feat(admin): scaffold protected web panel"
```

---

## Task 7: Dashboard and event explorer

**Files:**

- Create: `admin-web/src/api/audit-api.ts`
- Create: `admin-web/src/layout/AdminLayout.tsx`
- Create: `admin-web/src/components/MetricCard.tsx`
- Create: `admin-web/src/components/AuditFilters.tsx`
- Create: `admin-web/src/components/EventTable.tsx`
- Create: `admin-web/src/components/StatusBadge.tsx`
- Create: `admin-web/src/components/AsyncState.tsx`
- Create: `admin-web/src/pages/DashboardPage.tsx`
- Create: `admin-web/src/pages/EventsPage.tsx`
- Create: `admin-web/src/pages/EventDetailPage.tsx`
- Create: `admin-web/src/pages/DashboardPage.test.tsx`
- Create: `admin-web/src/pages/EventsPage.test.tsx`
- Modify: `admin-web/src/App.tsx`
- Modify: `admin-web/src/styles.css`

**Interfaces:**

- TanStack query keys: `['audit-summary', filters]`, `['audit-events', filters]`,
  and `['audit-event', source, id]`.
- `EventTable` receives normalized API events and route callbacks; it does not
  know Prisma source shapes.
- Filter state is reflected in URL search parameters.

- [ ] **Step 1: Write failing dashboard tests**

Mock the API boundary and assert four metric cards, recent events, date filter,
loading, empty, retryable error, and navigation when a user/event is selected.

- [ ] **Step 2: Write failing explorer tests**

Assert description is primary text, code is visible beneath it, filters update
URL parameters, load-more uses `nextCursor`, and `StatusBadge` distinguishes
success, failure, approval, and neutral states without relying only on color.

- [ ] **Step 3: Run the page tests and confirm failure**

```bash
npm test -- src/pages/DashboardPage.test.tsx src/pages/EventsPage.test.tsx
```

- [ ] **Step 4: Implement typed query functions and reusable states**

Create functions matching backend paths exactly. `AsyncState` exposes readable
loading, empty, and error variants; error state displays the server correlation
ID when present and provides a retry button.

- [ ] **Step 5: Implement the approved dashboard and event pages**

Use Quipupay tokens:

```css
:root {
  --color-navy: #0b1f3a;
  --color-primary: #1d4ed8;
  --color-success: #0f766e;
  --color-warning: #b45309;
  --color-error: #b91c1c;
  --color-surface: #ffffff;
  --color-background: #f3f4f6;
  --color-text: #111827;
}
```

Implement keyboard focus, semantic tables, text labels alongside status colors,
and responsive behavior that preserves horizontal table access on narrow
screens.

- [ ] **Step 6: Run focused and full admin verification**

```bash
npm test -- src/pages/DashboardPage.test.tsx src/pages/EventsPage.test.tsx
npm test
npm run lint
npm run build
```

- [ ] **Step 7: Commit Task 7**

```bash
git add admin-web/src
git commit -m "feat(admin): add audit dashboard and explorer"
```

---

## Task 8: User search and activity timeline

**Files:**

- Create: `admin-web/src/pages/UsersPage.tsx`
- Create: `admin-web/src/pages/UserActivityPage.tsx`
- Create: `admin-web/src/pages/UserActivityPage.test.tsx`
- Modify: `admin-web/src/api/audit-api.ts`
- Modify: `admin-web/src/App.tsx`
- Modify: `admin-web/src/styles.css`

**Interfaces:**

- Query keys: `['admin-users', query]` and
  `['user-activity', userId, filters]`.
- User list and activity models contain masked identifiers only.

- [ ] **Step 1: Write failing user search and timeline tests**

Assert debounced search, masked DNI, navigation to `/users/:id/activity`, user
summary, newest-first timeline, code plus description, filter behavior,
load-more cursor, event detail navigation, and all async states.

```ts
expect(screen.getByText('••••5821')).toBeInTheDocument();
expect(screen.getByText('ACCOUNT_OPENED')).toBeInTheDocument();
expect(screen.getByText('Apertura de cuenta de ahorro en soles')).toBeInTheDocument();
```

- [ ] **Step 2: Run the page test and confirm failure**

```bash
npm test -- src/pages/UserActivityPage.test.tsx
```

- [ ] **Step 3: Implement user API functions and pages**

Keep search server-side. Do not retain the raw search term in technical logs or
browser storage. Link each event to `/events/:source/:id` and preserve a return
link to the originating user timeline.

- [ ] **Step 4: Run focused and full admin verification**

```bash
npm test -- src/pages/UserActivityPage.test.tsx
npm test
npm run lint
npm run build
```

- [ ] **Step 5: Commit Task 8**

```bash
git add admin-web/src
git commit -m "feat(admin): add user audit timeline"
```

---

## Task 9: CI, documentation, and full acceptance verification

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**

- Existing backend CI remains Node 20 and unchanged except where needed for
  clearer job separation.
- New admin CI uses Node 24 and `admin-web/package-lock.json`.

- [ ] **Step 1: Add the independent admin CI job**

```yaml
admin-web:
  name: Admin Web - Build & Test
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: admin-web
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: npm
        cache-dependency-path: admin-web/package-lock.json
    - run: npm ci
    - run: npm run lint
    - run: npm test
    - run: npm run build
```

- [ ] **Step 2: Document local operation and role provisioning**

Add README sections covering:

```text
backend: nvm use 20
admin-web: nvm use 24
VITE_API_URL=http://localhost:3000/api/v1
```

Document that `ADMIN`/`AUDITOR` roles are assigned directly by an authorized
operator in the database and that no public role-elevation endpoint exists.

- [ ] **Step 3: Run complete backend checks with Node 20**

```bash
cd backend
nvm use 20
npm ci
npm test -- --runInBand
npm run lint
npm run build
```

Expected: all suites pass, lint exits zero, Nest build exits zero.

- [ ] **Step 4: Run complete admin checks with Node 24**

```bash
cd admin-web
nvm use 24
npm ci
npm test
npm run lint
npm run build
```

Expected: all suites pass, lint exits zero, Vite production build exits zero.

- [ ] **Step 5: Run repository hygiene checks**

```bash
git diff --check
git status --short
git check-ignore .superpowers/
```

Expected: no whitespace errors; only intended tracked files are modified;
`.superpowers/` is ignored.

- [ ] **Step 6: Manually verify the approved flow**

With local PostgreSQL and backend running:

1. Register a user and confirm `USER_REGISTERED` plus the `USER` role.
2. Attempt panel access as `USER` and confirm `403`.
3. Assign `AUDITOR` through the documented database operation.
4. Login again, open the dashboard, and confirm summary metrics.
5. Open an account and confirm `ACCOUNT_OPENED` shows description plus code.
6. Select the actor and confirm registration, login, KYC, and account activity
   appear in newest-first order.
7. Copy a correlation ID from the UI and find the matching backend log line.
8. Inspect the event and confirm no PIN, token, raw DNI, image, or body exists.

- [ ] **Step 7: Commit Task 9**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "chore: verify audit panel in CI"
```

- [ ] **Step 8: Request final code review**

Use `superpowers:requesting-code-review` against the complete branch. Address
findings through `superpowers:receiving-code-review`, rerun both verification
sets, and only then use `superpowers:finishing-a-development-branch` to choose
merge, push, or PR handling.
