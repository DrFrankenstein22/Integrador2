# Key page dependency trees

## Mobile `/` authenticated home

Entry: `mobile/src/app/(tabs)/index.tsx`

- `mobile/src/components/Screen.tsx`
- `mobile/src/components/Button.tsx`
- `mobile/src/components/OfflineBanner.tsx`
- `mobile/src/context/AuthContext.tsx`
- `mobile/src/hooks/useAccounts.ts`
  - `mobile/src/services/accountsApi.ts`
  - `mobile/src/api/client.ts`
- `mobile/src/services/preferences.ts`
- `mobile/src/utils/format.ts`
- `mobile/src/constants/colors.ts`
- `mobile/src/constants/spacing.ts`
- `mobile/src/constants/typography.ts`

## Mobile `/login/pin`

Entry: `mobile/src/app/(auth)/login/pin.tsx`

- `mobile/src/components/Screen.tsx`
- `mobile/src/components/Keypad.tsx`
- `mobile/src/components/PinDots.tsx`
- `mobile/src/components/StepHeader.tsx`
- `mobile/src/context/AuthContext.tsx`
- `mobile/src/services/authApi.ts`
- `mobile/src/utils/keypad.ts`
- `mobile/src/utils/loginPin.ts`
- design token files

## New admin dashboard target

Entry planned: `admin-web/src/pages/DashboardPage.tsx`

- `admin-web/src/layout/AdminLayout.tsx`
- `admin-web/src/components/MetricCard.tsx`
- `admin-web/src/components/EventTable.tsx`
- `admin-web/src/components/StatusBadge.tsx`
- `admin-web/src/components/AsyncState.tsx`
- `admin-web/src/api/audit-api.ts`
- `admin-web/src/styles.css`
