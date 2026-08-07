# AI Usage

Built with Claude (Anthropic), used as a pair-programming assistant inside
an agentic coding CLI (Claude Code) with direct shell/file access. This
document describes how it was used, per the assignment's disclosure
requirement.

## Prompts that materially influenced architecture, security, or tests

1. **Initial framing** — "Build the Secure Multi-Tenant Activity Feed
   per these candidate instructions [pasted assignment], act as a senior
   engineer." This drove the overall shape: RLS-first tenant enforcement,
   a non-owner DB role, idempotency via a unique constraint, and 404 (not
   403) on cross-tenant access.
2. **Stack change mid-build** — "remove everything and use Next.js + TS
   tech stack." Originally an Express + plain-React scaffold had been
   built and manually verified (RLS, idempotency, cross-tenant denial all
   confirmed via curl/psql). This prompt discarded it entirely in favor of
   Next.js App Router with Route Handlers as the API, keeping the same
   security model and schema, and TypeScript throughout.
3. Implicit design decisions the model made without a specific prompt (and
   that were verified rather than taken on faith — see below): connecting
   as `app_user` instead of the migration-owner role (RLS is bypassed by
   table owners/superusers, which would silently defeat the tenant
   boundary if missed); returning 404 instead of 403 for cross-tenant
   access to avoid confirming another org's resource exists; using
   integration tests against the real built app + real Postgres rather
   than mocking the DB layer, since RLS enforcement is a property of the
   database, not of application code a mock would exercise.

## What was accepted, changed, or rejected

- **Accepted as-is:** the RLS policy design (`USING`/`WITH CHECK` on both
  `accounts` and `activity_entries`), the `ON CONFLICT DO NOTHING` +
  fetch-existing idempotency pattern, and the trigger that cross-checks
  `activity_entries.org_id` against the parent account's org.
- **Changed:** the first draft of `app/page.tsx` reset UI state (selected
  account, feed, errors) inside a `useEffect` keyed on the identity
  switcher, with `setState` calls at the top of the effect body. Running
  `eslint` (React's `react-hooks/set-state-in-effect` rule) flagged this
  as the "derived state via effect" anti-pattern. Rather than suppressing
  the lint rule, the component was restructured to key a child component
  (`<AccountWorkspace key={token} .../>`) on the identity, so switching
  identity remounts it and all per-identity state resets via normal
  `useState` initializers instead of imperative resets. Re-ran `eslint`
  after: clean.
- **Rejected:** an early instinct to fetch the account list with a plain
  `WHERE org_id = $1` clause in `GET /api/accounts` (bypassing RLS's
  session-variable filter for convenience, since the route was already
  scoping by `req.auth.orgId`). Caught during self-review before running
  it: that query ran through the RLS-enabled connection *without* first
  setting `app.current_org_id` via `withOrgContext`, so `current_setting(...,
  true)` would have returned `NULL` and RLS would have silently filtered
  out every row — not a security hole, but a correctness bug that would
  have shipped a broken endpoint. Fixed to route through `withOrgContext`
  like every other query.

## How AI-generated code and claims were verified

Nothing was taken on the model's word alone; everything load-bearing was
executed and observed:

- **RLS enforcement** was checked directly in `psql`: connected as
  `app_user`, set `app.current_org_id` to Acme's org, confirmed only
  Acme's account was visible — including via a direct `WHERE id = <globex
  account>` lookup, which returned zero rows rather than an error (proving
  the *filter*, not just a `WHERE` clause the app added).
- **Every required behavior was exercised over real HTTP** against the
  actual built Next.js server (`next build && next start`), not just unit
  tests: happy-path read/create, cross-tenant read denial, cross-tenant
  write denial, and idempotent retry — first via manual `curl`, then
  codified as the 6 tests in `tests/activities.integration.test.ts`, all
  run via `npm test` (`scripts/test-integration.sh`: reset DB → build →
  boot → test → teardown) and confirmed green.
- **`npx eslint .` and `next build`** (which runs the TypeScript compiler)
  were run after every structural change, not just at the end.
- Claims in the README about *why* a design choice was made (RLS bypass by
  owners/superusers, 404-vs-403 information leakage, `SET LOCAL` needing
  to run inside the same transaction as the scoped query) reflect standard,
  independently-verifiable Postgres/HTTP semantics, not assumed AI output.
