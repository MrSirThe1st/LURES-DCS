# UI verification

This project has user-facing UI on web (`apps/web`) and mobile (`apps/mobile`).

Screenshots alone are **insufficient** when interaction behavior must be verified.

## Preferred order

1. Browser automation / MCP when available (web)
2. Playwright for web E2E when appropriate
3. Unit/component tests for isolated behavior (Testing Library / RNTL)

## Local development

```bash
pnpm install
pnpm --filter @lures-dcs/web dev
pnpm --filter @lures-dcs/mobile start
```

Relevant paths:

- Web: `apps/web`
- Mobile: `apps/mobile`
- Shared UI (web primitives): `packages/ui`
- Design tokens: `packages/design-tokens`

## E2E expectations

- Cover critical authenticated journeys once implemented
- Assert status changes, verification actions, and unauthorized access where relevant
- TODO: add Playwright project config when first E2E suite is introduced
- TODO: define mobile E2E approach when required

## Unit / component expectations

- Prefer Testing Library for web components
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
| Responsive (web) | Usable on desktop; TODO mobile web breakpoints if required |
| Touch (mobile) | Adequate targets; operable in loading-floor context |
