# Route map

Framework: Expo Router file-based navigation for the existing mobile application.

- `/(auth)/welcome` → `mobile/src/app/(auth)/welcome.tsx`, unauthenticated stack.
- `/(auth)/register/*` → KYC registration wizard, unauthenticated stack.
- `/(auth)/login/*` → biometric, DNI, PIN, and recovery screens.
- `/(tabs)` → `mobile/src/app/(tabs)/index.tsx`, authenticated home and account summary.
- `/(tabs)/qr`, `/pagos`, `/mas` → authenticated tab placeholders/features.
- `/(app)/abrir-cuenta/*` → authenticated account-opening flow.
- `/(app)/cuenta/:id` → account detail and movement search.
- `/(app)/movimiento/:id` → movement receipt/detail.

New web target, not yet implemented: React Router SPA in `admin-web/` with `/login`, `/`, `/events`, `/events/:source/:id`, `/users`, and `/users/:id/activity`.
