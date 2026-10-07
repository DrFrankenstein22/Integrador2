# Diseño: Scaffold inicial de la app móvil Quipupay

## Contexto

El repositorio Quipupay tiene backend (NestJS) y documentación, pero no
existe todavía código de la app móvil. El stack oficial ya está decidido
en `documentacion/1.0/stack-tecnologico.md`: React Native + Expo Go +
TypeScript. La paleta de colores y reglas de accesibilidad ya están
definidas en `documentacion/1.0/paleta-wcag.md`, y la lista de pantallas
sugeridas está en `documentacion/1.0/mockups-wireframes/README.md`.

Este documento cubre únicamente el **scaffold inicial**: estructura de
proyecto, navegación base, tokens de diseño, capa de API/estado y
testing. No incluye la construcción de pantallas reales (onboarding,
login, dashboard, etc.) — eso se planifica en tareas siguientes, una vez
que el esqueleto esté validado.

## Objetivo

Tener un proyecto Expo funcional en `mobile/` que:

- Corra con `npx expo start` sin errores.
- Tenga la estructura de carpetas y convenciones que usará el resto del
  desarrollo móvil.
- Use la paleta de colores oficial como tokens tipados, no valores
  sueltos.
- Tenga listo (pero vacío de casos reales) el andamiaje de navegación,
  llamadas a API y testing.

## Decisiones

| Área | Decisión | Razón |
| --- | --- | --- |
| Routing | Expo Router | Estándar actual de Expo, basado en archivos, simplifica separar flujo auth vs. app principal con grupos de rutas. |
| Estilos | `StyleSheet` nativo + tokens propios en `src/constants/` | Cero dependencias extra, control total sobre la paleta WCAG ya definida. |
| Estado servidor | TanStack Query | Cache/loading/retry estándar para consumir la API REST del backend. |
| Estado sesión/UI | React Context | Suficiente para MVP académico; evita el boilerplate de Redux. |
| Testing | `jest-expo` + `@testing-library/react-native` | Consistente con Jest ya usado en el backend; deja un smoke test, no cobertura completa. |
| Package manager | npm | Mismo gestor que usa `backend/`, evita mezclar lockfiles en el repo. |
| Lint/format | `eslint-config-expo` + Prettier | Alineado al estilo TypeScript ya usado en el backend. |
| Alcance de pantallas | Solo esqueleto de navegación + 1-2 placeholders (welcome, dashboard vacío) | Valida que la estructura funciona antes de invertir en pantallas reales. |

## Estructura de carpetas

```text
mobile/
  app/
    (auth)/
      welcome.tsx        # placeholder
      login.tsx          # placeholder
    (tabs)/
      _layout.tsx        # tab navigator (dashboard, transferencias, tarjeta, seguridad)
      index.tsx          # placeholder dashboard
    _layout.tsx          # layout raíz: decide (auth) vs (tabs) según AuthContext
  src/
    api/
      client.ts          # wrapper fetch, lee EXPO_PUBLIC_API_URL
      queryClient.ts      # instancia TanStack QueryClient
    components/
      Screen.tsx          # wrapper de pantalla con safe-area + fondo
      Button.tsx
    constants/
      colors.ts           # paleta de paleta-wcag.md, tipada
      spacing.ts
      typography.ts
    context/
      AuthContext.tsx      # sesión mock (isAuthenticated, login(), logout())
    hooks/
      useAuth.ts
  assets/
  app.json
  babel.config.js
  tsconfig.json
  jest.config.js
  .env.example
  .gitignore
  package.json
```

`app/` contiene solo ruteo (Expo Router); toda la lógica y UI
reutilizable vive en `src/`. Este límite se mantiene según crezcan las
pantallas reales.

## Navegación

- `app/_layout.tsx` envuelve todo en `AuthProvider` y `QueryClientProvider`,
  y redirige entre el grupo `(auth)` y el grupo `(tabs)` según
  `AuthContext.isAuthenticated`.
- `(auth)` agrupa welcome/login sin tab bar.
- `(tabs)` agrupa las secciones post-login (dashboard como placeholder
  inicial; transferencias/tarjeta/seguridad se agregan cuando se
  construyan esas pantallas — no se crean tabs vacíos de más para
  evitar código muerto).

## Tokens de diseño

`src/constants/colors.ts` exporta un objeto tipado con las claves de la
tabla en `paleta-wcag.md` (`primaryDark`, `primary`, `secondary`,
`warning`, `error`, `backgroundLight`, `textPrimary`, `textSecondary`,
`white`), usando los valores hex exactos del documento. `spacing.ts` y
`typography.ts` son escalas mínimas (4/8/12/16/24/32 y tamaños de fuente
base) para empezar; se amplían cuando las pantallas reales lo requieran.

## Capa de API y estado

- `src/api/client.ts`: función `apiFetch(path, options)` que arma la URL
  desde `process.env.EXPO_PUBLIC_API_URL`, agrega headers JSON, y lanza
  error tipado en respuestas no-2xx. Sin lógica de negocio — cada
  feature futura agrega sus propios hooks de TanStack Query sobre esta
  base.
- `src/context/AuthContext.tsx`: estado mock (`isAuthenticated: boolean`,
  `login()`, `logout()`) usando `useState` en memoria. Se conecta al
  backend real de `auth` cuando ese módulo exista.

## Testing

- `jest-expo` como preset, `@testing-library/react-native` para render.
- Un smoke test (`app/_layout.test.tsx`) que renderiza el layout raíz y
  verifica que monta sin lanzar errores.
- No se agregan tests de pantallas placeholder — no hay lógica que
  probar todavía.

## Configuración y entorno

- `.env.example` con `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1`
  (coincide con el puerto/prefijo del backend en `backend/.env.example`
  y `main.ts`).
- `.gitignore` de `mobile/` ignora `node_modules/`, `.expo/`, `.env`,
  y artefactos de build nativos.

## Fuera de alcance

- Pantallas reales (registro, OTP, captura de DNI/selfie, PIN,
  transferencias, QR, tarjeta virtual, seguridad, panel admin).
- Integración real con endpoints del backend (solo existe `/health` por
  ahora).
- Persistencia de sesión (SecureStore/AsyncStorage) — el `AuthContext`
  mock vive solo en memoria hasta que haya un endpoint de auth real
  contra el cual validar tokens.
- CI para mobile (lint/test en GitHub Actions) — se agrega junto con el
  resto del CI del proyecto si se decide en otra tarea.

## Testing del propio scaffold (criterio de aceptación)

- `npx expo start` levanta sin errores de compilación.
- `npm test` corre el smoke test y pasa.
- `npm run lint` no reporta errores.
- Las pantallas placeholder navegan entre `(auth)` y `(tabs)` alternando
  manualmente el valor mock de `isAuthenticated`.
