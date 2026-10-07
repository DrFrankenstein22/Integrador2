# Mobile Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Expo (React Native + TypeScript) project in `mobile/` with Expo Router navigation, the official color palette as typed tokens, a thin API client, mock auth context, TanStack Query wiring, and jest-expo testing — ready for real screens to be built on top.

**Architecture:** `mobile/src/app/` holds only Expo Router routes (an `(auth)` group for welcome/login and a `(tabs)` group for the post-login dashboard), gated by `Stack.Protected` in the root layout based on a mock `AuthContext`. The rest of `mobile/src/` (`api/`, `components/`, `constants/`, `context/`) holds everything reusable: design tokens, the API client, the auth context, and shared UI components. Routes import from those sibling directories via the `@/src/...` path alias rather than relative paths, so the import depth doesn't depend on how deep a given route sits in the Expo Router file tree.

> **Note (post-Task-1 ruling):** the plan originally assumed a top-level `mobile/app/`, matching the `create-expo-app` layout current when it was written. The tool's default template has since moved routes under `mobile/src/app/`; Task 1's actual output (and every task below) follows that real layout. See the ledger's Task 1 entry for the full ruling.

**Tech Stack:** Expo SDK 57, Expo Router, TypeScript, `@tanstack/react-query`, `jest-expo` + `@testing-library/react-native`, `eslint-config-expo` (flat config) + Prettier, npm.

**Spec:** `docs/superpowers/specs/2026-09-01-mobile-scaffold-design.md`

## Global Constraints

- Project lives at `mobile/` at the repo root (sibling of `backend/`).
- Package manager is npm — do not introduce a yarn/pnpm lockfile.
- Navigation is Expo Router only — no React Navigation installed directly.
- Styling is `StyleSheet.create` + tokens in `src/constants/` — no NativeWind, no UI component library.
- Color values must match `documentacion/1.0/paleta-wcag.md` exactly: primaryDark `#0B1F3A`, primary `#1D4ED8`, secondary `#0F766E`, warning `#B45309`, error `#B91C1C`, backgroundLight `#F3F4F6`, textPrimary `#111827`, textSecondary `#374151`, white `#FFFFFF`.
- `EXPO_PUBLIC_API_URL` is the only env var this scaffold needs; default in `.env.example` is `http://localhost:3000/api/v1` (matches `backend/.env.example` port and the `/api/v1` prefix used by the backend).
- Tests are written only where there is real logic (auth state transitions, API client URL/error handling, the root layout's routing). Placeholder screens, tokens, and purely presentational components are not unit-tested — this matches the approved spec's testing scope and the acceptance criteria (manual nav check + one root-layout smoke test).
- Out of scope for this plan: real screens beyond placeholders, real backend integration beyond `/health`, session persistence (SecureStore/AsyncStorage), CI.
- Every task's commands run from `/home/aarondevl/utp/Quipupay` unless a step says `cd mobile` first. Branch is `feature/mobile-scaffold`.

---

### Task 1: Initialize the Expo project

**Files:**
- Create: `mobile/` (entire project, via `create-expo-app`)
- Modify: `mobile/tsconfig.json` (add path alias)
- Create: `mobile/.env.example`
- Modify: `mobile/.gitignore` (ensure `.env` is ignored)

**Interfaces:**
- Produces: a runnable Expo project at `mobile/`, TypeScript path alias `@/*` → `mobile/*`, env var `EXPO_PUBLIC_API_URL` documented in `.env.example`.
- Consumes: nothing (first task).

- [ ] **Step 1: Create the project**

Run from the repo root:

```bash
cd /home/aarondevl/utp/Quipupay
npx create-expo-app@latest mobile --template default@sdk-57
```

Expected: a new `mobile/` directory with `package.json`, `app/`, `assets/`, `tsconfig.json`, `app.json`, `.gitignore`, and `node_modules/` already installed.

- [ ] **Step 2: Strip the example boilerplate**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npm run reset-project
```

This moves the template's example routes/components into `app-example/` and leaves a blank `app/index.tsx` + `app/_layout.tsx`. We don't need the example code kept around for reference, so delete it:

```bash
rm -rf app-example
```

Expected: `mobile/app/` contains only `index.tsx` and `_layout.tsx`. Top-level `components/`, `constants/`, `hooks/` boilerplate folders from the template are gone (they were moved into the now-deleted `app-example/`).

- [ ] **Step 3: Add the `@/*` path alias**

Open `mobile/tsconfig.json`. Ensure `compilerOptions` includes a `paths` entry so later tasks can import with `@/src/...`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

Keep whatever `include`/other keys the generated file already has — only add the `paths` key if it's missing.

- [ ] **Step 4: Add the env example file**

Create `mobile/.env.example`:

```text
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

- [ ] **Step 5: Confirm `.env` is gitignored**

Open `mobile/.gitignore`. If `.env` is not already listed, append:

```text
.env
.env.local
```

- [ ] **Step 6: Verify the project compiles**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx expo export
```

Expected: exits 0 and prints an "Exported:" summary (no TypeScript or bundling errors).

- [ ] **Step 7: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile
git commit -m "feat: inicializar proyecto Expo con Expo Router"
```

---

### Task 2: Testing infrastructure (jest-expo + React Native Testing Library)

**Files:**
- Modify: `mobile/package.json` (devDependencies, `test` script, `jest` config)
- Modify: `mobile/tsconfig.json` (add Jest types)

**Interfaces:**
- Produces: a working `npm test` command using the `jest-expo` preset, available in every later task.
- Consumes: nothing beyond Task 1's project.

- [ ] **Step 1: Install the testing packages**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx expo install --dev jest-expo jest @types/jest @testing-library/react-native
```

- [ ] **Step 2: Configure Jest**

In `mobile/package.json`, add/update:

```json
{
  "scripts": {
    "test": "jest --watchAll=false"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

(`--watchAll=false` so `npm test` exits with a pass/fail status instead of hanging in watch mode; use `npx jest --watchAll` manually for interactive development.)

- [ ] **Step 3: Add Jest types**

In `mobile/tsconfig.json`, add `"types": ["jest"]` to `compilerOptions`.

- [ ] **Step 4: Verify the config loads**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest --passWithNoTests
```

Expected: PASS, "No tests found, exiting with code 0" (or equivalent) — this only proves the preset/config load correctly; real tests start next task.

- [ ] **Step 5: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/package.json mobile/tsconfig.json mobile/package-lock.json
git commit -m "feat: configurar testing con jest-expo"
```

---

### Task 3: Design tokens (colors, spacing, typography)

**Files:**
- Create: `mobile/src/constants/colors.ts`
- Create: `mobile/src/constants/spacing.ts`
- Create: `mobile/src/constants/typography.ts`

**Interfaces:**
- Produces: `colors` (keys: `primaryDark`, `primary`, `secondary`, `warning`, `error`, `backgroundLight`, `textPrimary`, `textSecondary`, `white`), `spacing` (keys: `xs`, `sm`, `md`, `lg`, `xl`, `xxl`), `typography` (`typography.sizes.{sm,md,lg,xl}`, `typography.weights.{regular,medium,bold}`). Consumed by every UI component/screen from Task 6 onward.
- Consumes: nothing.

These are pure data — no branching logic — so per the Global Constraints they are not unit-tested; correctness is a direct transcription of `documentacion/1.0/paleta-wcag.md`, checked visually in this step.

- [ ] **Step 1: Create the color tokens**

Create `mobile/src/constants/colors.ts`:

```ts
export const colors = {
  primaryDark: '#0B1F3A',
  primary: '#1D4ED8',
  secondary: '#0F766E',
  warning: '#B45309',
  error: '#B91C1C',
  backgroundLight: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#374151',
  white: '#FFFFFF',
} as const;
```

- [ ] **Step 2: Create the spacing scale**

Create `mobile/src/constants/spacing.ts`:

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
```

- [ ] **Step 3: Create the typography scale**

Create `mobile/src/constants/typography.ts`:

```ts
export const typography = {
  sizes: {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
  weights: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;
```

- [ ] **Step 4: Verify types compile**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/constants
git commit -m "feat: agregar tokens de diseno (colores, spacing, tipografia)"
```

---

### Task 4: API client

**Files:**
- Create: `mobile/src/api/client.ts`
- Test: `mobile/src/api/client.test.ts`

**Interfaces:**
- Produces: `apiFetch<T>(path: string, options?: RequestInit): Promise<T>` and `class ApiError extends Error { status: number }`. Consumed by future feature hooks (out of scope here) and by Task 8's `queryClient` setup only indirectly (no direct call in this scaffold).
- Consumes: `process.env.EXPO_PUBLIC_API_URL` (from Task 1's `.env.example` convention).

- [ ] **Step 1: Write the failing tests**

Create `mobile/src/api/client.test.ts`:

```ts
import { apiFetch, ApiError } from './client';

const ORIGINAL_URL = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL_URL;
  jest.resetAllMocks();
});

describe('apiFetch', () => {
  test('builds the URL from EXPO_PUBLIC_API_URL and returns parsed JSON on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });

    const result = await apiFetch<{ status: string }>('/health');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/health',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result).toEqual({ status: 'ok' });
  });

  test('throws ApiError with the response status on a non-2xx response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(apiFetch('/health')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/health')).rejects.toMatchObject({ status: 500 });
  });

  test('throws when EXPO_PUBLIC_API_URL is not set', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    await expect(apiFetch('/health')).rejects.toThrow('EXPO_PUBLIC_API_URL is not set');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest src/api/client.test.ts
```

Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 3: Implement the client**

Create `mobile/src/api/client.ts`:

```ts
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest src/api/client.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/api/client.ts mobile/src/api/client.test.ts
git commit -m "feat: agregar cliente API base"
```

---

### Task 5: Auth context

**Files:**
- Create: `mobile/src/context/AuthContext.tsx`
- Test: `mobile/src/context/AuthContext.test.tsx`

**Interfaces:**
- Produces: `AuthProvider` (React component, wraps children) and `useAuth(): { isAuthenticated: boolean; signIn: () => void; signOut: () => void }`. Consumed by Task 7's login/dashboard screens and Task 8's root layout.
- Consumes: nothing (in-memory mock state only — no persistence, no backend call, per spec's out-of-scope list).

- [ ] **Step 1: Write the failing tests**

Create `mobile/src/context/AuthContext.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

function wrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  test('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('signIn sets isAuthenticated to true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.signIn());
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('signOut sets isAuthenticated back to false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.signIn());
    act(() => result.current.signOut());
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest src/context/AuthContext.test.tsx
```

Expected: FAIL — `Cannot find module './AuthContext'`.

- [ ] **Step 3: Implement the context**

Create `mobile/src/context/AuthContext.tsx`:

```tsx
import { createContext, useContext, useState, type PropsWithChildren } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value: AuthContextValue = {
    isAuthenticated,
    signIn: () => setIsAuthenticated(true),
    signOut: () => setIsAuthenticated(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest src/context/AuthContext.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/context
git commit -m "feat: agregar AuthContext mock"
```

---

### Task 6: Shared UI components (Screen, Button)

**Files:**
- Create: `mobile/src/components/Screen.tsx`
- Create: `mobile/src/components/Button.tsx`

**Interfaces:**
- Produces: `Screen({ children, style, ...rest }: ViewProps)` (SafeAreaView wrapper with the app background color) and `Button({ label, onPress }: { label: string; onPress: () => void })`. Consumed by Task 7's screens.
- Consumes: `colors` and `spacing` from Task 3.

Purely presentational — no branching logic — so per the Global Constraints these are not unit-tested here (same treatment as the placeholder screens in Task 7).

- [ ] **Step 1: Create the Screen component**

Create `mobile/src/components/Screen.tsx`:

```tsx
import { SafeAreaView, StyleSheet, type ViewProps } from 'react-native';
import { colors } from '../constants/colors';

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={[styles.container, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
});
```

- [ ] **Step 2: Create the Button component**

Create `mobile/src/components/Button.tsx`:

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

type ButtonProps = {
  label: string;
  onPress: () => void;
};

export function Button({ label, onPress }: ButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    color: colors.white,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Verify types compile**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/components
git commit -m "feat: agregar componentes Screen y Button"
```

---

### Task 7: Placeholder screens and route groups

**Files:**
- Create: `mobile/src/app/(auth)/_layout.tsx`
- Create: `mobile/src/app/(auth)/welcome.tsx`
- Create: `mobile/src/app/(auth)/login.tsx`
- Create: `mobile/src/app/(tabs)/_layout.tsx`
- Create: `mobile/src/app/(tabs)/index.tsx`
- Delete: `mobile/src/app/index.tsx` (replaced by the two route groups)

**Note:** routes live at `mobile/src/app/...` (not top-level `mobile/app/`) — see the Architecture note at the top of this plan. Import shared code via the `@/src/...` alias (already configured in `mobile/tsconfig.json` by Task 1), not relative paths.

**Interfaces:**
- Produces: routes `/welcome`, `/login` (in the `(auth)` group) and `/` → dashboard tab (in the `(tabs)` group). Consumed by Task 8's root layout, which decides which group is reachable.
- Consumes: `useAuth` from Task 5, `Screen`/`Button` from Task 6, `colors`/`spacing` from Task 3.

Placeholder screens — no unit tests, per the Global Constraints (matches the approved spec's testing scope). Task 8 adds the one routing smoke test that exercises this structure end to end.

- [ ] **Step 1: Remove the leftover default route**

```bash
rm /home/aarondevl/utp/Quipupay/mobile/src/app/index.tsx
```

- [ ] **Step 2: Create the auth group layout**

Create `mobile/src/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create the welcome screen**

Create `mobile/src/app/(auth)/welcome.tsx`:

```tsx
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

export default function WelcomeScreen() {
  return (
    <Screen style={styles.content}>
      <Text style={styles.title}>Quipupay</Text>
      <Text style={styles.subtitle}>Banca digital simulada</Text>
      <Button label="Continuar" onPress={() => router.push('/(auth)/login')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 4: Create the login screen**

Create `mobile/src/app/(auth)/login.tsx`:

```tsx
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <Screen style={styles.content}>
      <Text style={styles.title}>Ingresar</Text>
      <Text style={styles.subtitle}>Login con PIN (pendiente de implementar)</Text>
      <Button label="Entrar" onPress={signIn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 5: Create the tabs group layout**

Create `mobile/src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Create the dashboard placeholder**

Create `mobile/src/app/(tabs)/index.tsx`:

```tsx
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

export default function DashboardScreen() {
  const { signOut } = useAuth();

  return (
    <Screen style={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Saldo y movimientos (pendiente de implementar)</Text>
      <Button label="Cerrar sesion" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 7: Commit**

(This step intentionally does not run `expo export` yet — the root layout in `src/app/_layout.tsx` still references the old blank template shape and doesn't know about these groups until Task 8 rewrites it.)

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/app
git commit -m "feat: agregar pantallas placeholder y grupos de rutas"
```

---

### Task 8: Root layout — auth gating, TanStack Query, smoke test

**Files:**
- Create: `mobile/src/api/queryClient.ts`
- Modify: `mobile/src/app/_layout.tsx` (full rewrite)
- Create: `mobile/__tests__/root-layout.test.tsx`

**Interfaces:**
- Produces: the composed root layout (`QueryClientProvider` + `AuthProvider` + `Stack.Protected` gating between `(auth)` and `(tabs)`). Nothing later in this plan consumes this directly — it's the top of the tree.
- Consumes: `AuthProvider`/`useAuth` (Task 5), `queryClient` (this task), the `(auth)`/`(tabs)` groups (Task 7).

**Note:** routes live at `mobile/src/app/...` (not top-level `mobile/app/`) — see the Architecture note at the top of this plan. `mobile/__tests__/` stays at the project root (sibling of `src/`), per the Expo Router testing docs' guidance to keep test files out of the routes directory.

- [ ] **Step 1: Install TanStack Query**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npm install @tanstack/react-query
```

- [ ] **Step 2: Write the failing smoke test**

Create `mobile/__tests__/root-layout.test.tsx`:

```tsx
import { renderRouter, screen } from 'expo-router/testing-library';

test('unauthenticated user landing on /welcome sees the welcome screen', async () => {
  renderRouter('../src/app', { initialUrl: '/welcome' });

  await screen.findByText('Quipupay');
  expect(screen).toHavePathname('/welcome');
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest __tests__/root-layout.test.tsx
```

Expected: FAIL — the current `src/app/_layout.tsx` (still the CLI-generated blank default) doesn't declare the `(auth)`/`(tabs)` groups or wrap them in `AuthProvider`/`QueryClientProvider`, so `/welcome` won't resolve.

- [ ] **Step 4: Create the query client**

Create `mobile/src/api/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});
```

- [ ] **Step 5: Rewrite the root layout**

Replace the full contents of `mobile/src/app/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { queryClient } from '@/src/api/queryClient';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx jest __tests__/root-layout.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run full verification**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx tsc --noEmit
npx jest
npx expo export
```

Expected: all three succeed with no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile/src/api/queryClient.ts mobile/src/app/_layout.tsx mobile/__tests__ mobile/package.json mobile/package-lock.json
git commit -m "feat: conectar layout raiz con auth, query client y rutas protegidas"
```

---

### Task 9: Lint and formatting

**Files:**
- Create/Modify: `mobile/eslint.config.js`
- Create: `mobile/.prettierrc`
- Create: `mobile/.prettierignore`
- Modify: any files flagged by lint/format (from earlier tasks)

**Interfaces:**
- Produces: `npm run lint` (already provided by the template's `package.json` as `expo lint`) passing cleanly, and Prettier-formatted source.
- Consumes: all files created in Tasks 1–8.

- [ ] **Step 1: Generate/confirm the ESLint config**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx expo lint
```

On SDK 57 this scaffolds `eslint.config.js` using the flat config format (`eslint-config-expo/flat`) if it doesn't already exist. If it already exists (the template ships one), this just runs lint — read the output.

- [ ] **Step 2: Install Prettier**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npm install --save-dev prettier eslint-config-prettier
```

- [ ] **Step 3: Add Prettier config**

Create `mobile/.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

Create `mobile/.prettierignore`:

```text
node_modules
.expo
dist
android
ios
```

- [ ] **Step 4: Make ESLint defer stylistic rules to Prettier**

Open `mobile/eslint.config.js`. Add `eslint-config-prettier` as the last entry in the exported config array so it can disable any ESLint stylistic rules that would conflict with Prettier, e.g.:

```js
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
];
```

Adjust to match whatever shape the generated file already has (some templates export via `defineConfig([...])` — keep that wrapper if present, just add `prettierConfig` as the last array element).

- [ ] **Step 5: Fix lint and formatting issues**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx prettier --write .
npx expo lint
```

Fix anything reported (should be none from our own files if the code above was typed as written; the template's own generated files may need re-formatting).

- [ ] **Step 6: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add mobile
git commit -m "chore: configurar eslint y prettier"
```

---

### Task 10: Documentation and final verification

**Files:**
- Modify: `README.md` (repo root)
- Create: `mobile/README.md`

**Interfaces:**
- Produces: onboarding docs for the mobile project. No code interfaces.
- Consumes: nothing — reads the finished state of Tasks 1–9.

- [ ] **Step 1: Update the root README's repo structure section**

In `/home/aarondevl/utp/Quipupay/README.md`, update the `## Estructura del repositorio` code block to add the `mobile/` tree alongside `backend/`:

```text
backend/
  src/
    common/
    health/
    ledger/
    transactions/
    transfers/
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

documentacion/
  1.0/
    gestion-git.md
    arquitectura-backend.md
    stack-tecnologico.md
    paleta-wcag.md
    mockups-wireframes/
```

Also add a new `## Ejecutar mobile` section after `## Ejecutar backend`, mirroring its style:

```markdown
## Ejecutar mobile

\`\`\`bash
cd mobile
npm install
npx expo start
\`\`\`
```

- [ ] **Step 2: Create the mobile README**

Create `mobile/README.md`:

```markdown
# Quipupay Mobile

App movil academica para Quipupay construida con Expo (React Native + TypeScript).

## Stack

- React Native
- Expo / Expo Router
- TypeScript
- TanStack Query
- Jest / jest-expo / React Native Testing Library

## Ejecutar

\`\`\`bash
cd mobile
npm install
npx expo start
\`\`\`

Copia \`.env.example\` a \`.env\` y ajusta \`EXPO_PUBLIC_API_URL\` si el backend no corre en \`http://localhost:3000\`.

## Probar

\`\`\`bash
cd mobile
npm test
\`\`\`

## Lint

\`\`\`bash
cd mobile
npm run lint
\`\`\`

## Estructura

\`\`\`text
src/
  app/
    (auth)/       # welcome, login
    (tabs)/       # dashboard y futuras secciones post-login
  api/          # cliente HTTP y query client
  components/   # UI compartida
  constants/    # tokens: colores, spacing, tipografia
  context/      # AuthContext
\`\`\`
```

- [ ] **Step 3: Run full verification**

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx tsc --noEmit
npm test
npm run lint
npx expo export
```

Expected: all four succeed with no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/aarondevl/utp/Quipupay
git add README.md mobile/README.md
git commit -m "docs: documentar app movil en README"
```

- [ ] **Step 5: Manual navigation check**

Automated tests cover the routing logic, but the spec's acceptance criteria also call for a manual check of the actual app. Run:

```bash
cd /home/aarondevl/utp/Quipupay/mobile
npx expo start
```

Open the app (web, iOS simulator, or Expo Go). Confirm:
- It lands on the welcome screen (`(auth)/welcome`).
- Tapping "Continuar" navigates to the login screen (`(auth)/login`).
- Tapping "Entrar" on login flips the mock `AuthContext` and lands on the dashboard tab (`(tabs)/index`).
- Tapping "Cerrar sesion" on the dashboard returns to the welcome screen.

This step has no commit — it's a manual sanity check, not a code change.
