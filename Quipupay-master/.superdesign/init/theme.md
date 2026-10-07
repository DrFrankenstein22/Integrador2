# Theme

## Compact token summary

- Palette: azul noche `#0B1F3A`, azul financiero `#1D4ED8`, verde confianza `#0F766E`, ámbar `#B45309`, rojo `#B91C1C`, fondo `#F3F4F6`, text `#111827`/`#374151`, white `#FFFFFF`.
- Typography: Plus Jakarta Sans in product documentation; current mobile source uses platform sans with 14, 16, 20, 24, 28px and weights 400, 500, 600, 700.
- Spacing: 4, 8, 12, 16, 24, 32px.
- Shape: 12px controls, 16px content groups, round avatars.
- Elevation: restrained cool shadow, normally 4px vertical / 10–16px blur.
- Accessibility: 4.5:1 normal text, 3:1 large text and icons, 48px minimum hit areas, state labels never color-only.
- Existing UI has no dark theme or web breakpoints.

## Raw sources

`mobile/src/constants/colors.ts`

```ts
export const colors = { primaryDark: '#0B1F3A', primary: '#1D4ED8', secondary: '#0F766E', warning: '#B45309', error: '#B91C1C', backgroundLight: '#F3F4F6', textPrimary: '#111827', textSecondary: '#374151', white: '#FFFFFF' } as const;
```

`mobile/src/constants/spacing.ts`

```ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
```

`mobile/src/constants/typography.ts`

```ts
export const typography = { sizes: { sm: 14, md: 16, lg: 20, xl: 24, xxl: 28 }, weights: { regular: '400', medium: '500', semibold: '600', bold: '700' } } as const;
```
