# UI verification

This project has user-facing UI on the **desktop** app (`apps/desktop`) and the **mobile** app (`apps/mobile`).

Screenshots alone are **insufficient** when interaction behavior must be verified.

## Preferred order

1. Exercise the Tauri desktop window for management flows
2. Exercise the Expo app for loading-floor flows
3. Unit/component tests for isolated behavior (Testing Library / RNTL)

Browser automation is **not** the primary verification path for management. Management is a dedicated desktop application.

## Local development

```bash
pnpm install
pnpm --filter @lures-dcs/desktop dev
pnpm --filter @lures-dcs/mobile start
```

Relevant paths:

- Desktop: `apps/desktop`
- Mobile: `apps/mobile`
- Shared UI (desktop primitives): `packages/ui`
- Design tokens: `packages/design-tokens`

## E2E expectations

- Cover critical authenticated journeys once implemented
- Assert status changes, verification actions, and unauthorized access where relevant
- TODO: define desktop E2E approach when first suite is introduced
- TODO: define mobile E2E approach when required

## Unit / component expectations

- Prefer Testing Library for desktop components
- Prefer React Native Testing Library for mobile components
- Test accessible labels, disabled/loading states, and meaningful interactions
- Do not snapshot-test entire screens as a substitute for behavior checks

## Placeholder test accounts

Use environment placeholders only — never real credentials in docs or code:

- `{{ADMIN_EMAIL}}` / `{{ADMIN_PASSWORD}}`
- `{{OPERATOR_EMAIL}}` / `{{OPERATOR_PASSWORD}}`

TODO: document bootstrap of local test users once auth seeding exists.

## Authentication setup TODOs

- TODO: local Supabase Auth project wiring
- TODO: role assignment for Management vs Loading staff
- TODO: protected-route redirect behavior per surface

## Important UI states to verify

| State | Expectation |
|-------|-------------|
| Loading | Clear pending state; no false “empty” |
| Empty | Explicit empty message for no trucks/bags |
| Error | Actionable error without leaking secrets |
| Success | Confirmation of verification/save/status change |
| Unauthorized | Blocked action; no privileged data flash |
| Desktop window | Usable at typical office window sizes |
| Touch (mobile) | Adequate targets; operable in loading-floor context |
