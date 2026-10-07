# Extractable components

## Button
- Source: `mobile/src/components/Button.tsx`
- Category: basic
- Description: primary, secondary, and dark-outline action control.
- Extractable props: `variant`, `disabled`, `label`.
- Hardcoded: 52px minimum height, 12px radius, brand palette.

## Screen
- Source: `mobile/src/components/Screen.tsx`
- Category: layout
- Description: safe-area page surface.
- Extractable props: `style`.
- Hardcoded: light background.

## TopBar
- Source: `mobile/src/components/TopBar.tsx`
- Category: layout
- Description: back navigation with title or progress.
- Extractable props: `title`, `step`, `totalSteps`.
- Hardcoded: arrow glyph and brand colors.

## MovementRow
- Source: `mobile/src/components/MovementRow.tsx`
- Category: basic
- Description: dense activity row with icon, description, date, and amount.
- Extractable props: movement content and press action.
- Hardcoded: transaction icon map and positive-state green.
