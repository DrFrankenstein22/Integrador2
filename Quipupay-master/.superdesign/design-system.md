# Quipupay Admin design system

## Product and scene

Quipupay is a Peruvian academic digital-bank simulation. This new desktop web surface serves auditors and administrators who review dense account activity, authentication attempts, and user timelines.

Physical scene: an auditor works during business hours on a 14–27 inch display in a bright office, scanning evidence carefully and returning to filters repeatedly. This forces a light theme with crisp contrast and restrained density.

## Direction

Use an “operational ledger” direction: quiet, precise, trustworthy, and visibly related to the mobile product without copying a mobile home screen. The activity table is the main surface. Avoid generic SaaS decoration, oversized hero metrics, gradients, glass, nested cards, and ornamental charts.

Color strategy is restrained. Tinted blue-gray neutrals carry most surfaces; financial blue is limited to active navigation, links, primary actions, and focus. Green, amber, and red appear only for labeled status semantics.

## Color tokens

Implement colors in OKLCH while preserving the established Quipupay appearance:

- Navy brand: `oklch(0.24 0.055 255)` (source `#0B1F3A`).
- Primary blue: `oklch(0.49 0.22 264)` (source `#1D4ED8`).
- Success teal: `oklch(0.49 0.09 183)` (source `#0F766E`).
- Warning amber: `oklch(0.56 0.16 48)` (source `#B45309`).
- Error red: `oklch(0.50 0.19 27)` (source `#B91C1C`).
- App background: `oklch(0.967 0.004 264)`.
- Surface: `oklch(0.99 0.004 255)`, never pure white.
- Primary text: `oklch(0.21 0.034 264)`.
- Secondary text: `oklch(0.37 0.034 259)`.
- Borders: `oklch(0.90 0.012 255)`.
- Selected row: `oklch(0.96 0.025 255)`.

## Typography and rhythm

Use Plus Jakarta Sans when available, with system sans fallback. Body 14–16px, labels 12–13px, page headings 28px, section headings 18–20px. Use tabular numerals for counts, dates, IP addresses, and identifiers. Maintain at least 1.25x hierarchy between label and page title. Prose max-width is 70ch; data tables may run wider.

Spacing uses 4, 8, 12, 16, 24, 32, and 48px. Controls are 40–44px tall on desktop, never below 44px for important actions. Radius: 10px controls, 14px content groups. Shadows are rare; use borders and surface contrast first.

## Application shell

Desktop has a 240px navy sidebar with real Quipupay wordmark or icon asset, product label “Control”, navigation for Resumen, Eventos, and Usuarios, and session identity/logout at the bottom. Main content uses a compact top context row and a max-width around 1440px. On narrow screens, sidebar becomes a horizontal top navigation; tables retain horizontal scrolling.

## Core pages

- Login: focused two-column composition on desktop. Brand/context pane in navy, accessible DNI/PIN form on a light surface. Never persist the token in browser storage.
- Dashboard: page title and date controls; four compact metrics in a single rail; recent activity table dominates the page.
- Events: filter bar reflected in URL, results count, dense semantic table, load-more pagination.
- Event detail: definition-list evidence view, human description first, technical code and correlation readily copyable.
- Users: server-side search by name or DNI with masked DNI in output.
- User activity: identity summary and newest-first timeline, retaining event code, human description, result, time, IP, and correlation.

## Components and states

Buttons, inputs, selects, links, rows, and navigation have visible hover, focus, active, disabled, and loading states. Focus uses a 2px blue outline with offset. Status badges always include text and a small shape/icon, never color alone. Loading uses table/metric skeletons. Empty states explain what filters or date range can be changed. Errors include retry and correlation ID when supplied.

Motion is limited to opacity/transform at 140–220ms with ease-out-quart. Respect reduced-motion. No layout-property animation, bounce, or decorative motion.

## Accessibility and copy

Meet WCAG AA contrast. Tables use captions, column headers, and keyboard-focusable row actions. Every input has a visible label. Spanish copy is concise and operational. Do not use em dashes. Full DNI, PIN, tokens, biometric data, request bodies, and authorization headers never appear.
