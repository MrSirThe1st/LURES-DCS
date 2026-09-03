# Design DNA

Documented design language intent. Implementation source of truth: `packages/design-tokens`.

Hierarchy:

```
brand.md
  → design-dna.md
    → packages/design-tokens
      → Web / Tailwind
      → Mobile / React Native theme
```

## Visual personality

Operational, calm, high-clarity interfaces for industrial loading work.

Prioritize:

- Fast recognition of truck/bag status
- Dense but readable operational lists
- Minimal decorative chrome

TODO: refine visual personality with stakeholders (no invented brand identity)

## Color system

**Production brand palette:** TODO: define production color palette

Do not invent a blue/purple/green brand identity.

Semantic tokens (required), mapped in `packages/design-tokens`:

- `color.background`
- `color.surface`
- `color.text.primary`
- `color.text.secondary`
- `color.border`
- `color.primary` / `color.primary.foreground`
- `color.destructive` / `color.destructive.foreground`
- `color.success` / `color.warning` (operational status support)

Temporary scaffolding values in code are **neutral grayscale placeholders** only so apps can run. They are not approved brand colors.

## Typography

**Production fonts:** TODO: select production typography

Temporary: platform system fonts so apps compile and run.

Do not treat temporary typography as final brand design.

## Spacing

Use tokenized spacing scale: `xs`, `sm`, `md`, `lg`, `xl` (and `2xl` only if needed).

Avoid one-off pixel values in components when a token exists.

## Radius

Tokenized: `sm`, `md`, `lg`, `full`.

Keep radius modest for an operational tool; avoid decorative “pill everything” patterns.

## Shadows / elevation

Minimal elevation. Prefer borders/surfaces over heavy multi-layer shadows.

## Component feel

- Composable primitives in `packages/ui` (web)
- Predictable, accessible, small
- No business rules inside generic UI
- Mobile components live in the mobile app (or a future deliberate cross-platform UI package) — do not force RN into `@lures-dcs/ui` prematurely

## Interaction principles

- Minimal clicks for bag verification and truck selection
- Clear loading / empty / error / success states
- Controlled status transitions visible to users
- Prefer large touch targets on mobile

## Per-surface guidance

| Surface | Guidance |
|---------|----------|
| Management web | Desktop-first operational dashboard density; keyboard focus visible |
| Mobile loading | One job per screen; large controls; readable outdoors/warehouse conditions TBD |

## Accessibility expectations

- Sufficient contrast once production colors are chosen (validate then)
- Visible focus states on web
- Accessible labels on controls
- Keyboard navigation for web flows
- Adequate touch targets on mobile
- Semantic controls
- Respect reduced motion where applicable
- Screen-reader compatible structure

## UI anti-patterns

- Inventing brand colors/fonts in app code
- Duplicating palettes per platform
- Cards/chrome that obscure operational status
- Giant components with embedded business logic
- Arbitrary Tailwind values that bypass tokens without reason
- Making mobile a pixel clone of web
