# Secure Multi-Tenant Account Activity Feed

A minimal, senior-track take-home implementation: a Next.js (App Router,
TypeScript) app backed by Postgres, where the tenant boundary is enforced
by the database itself via Row Level Security (RLS) — not by application
code that can be forgotten or bypassed.

## Setup & run

Requires Node 20+ and a local Postgres (via Docker, or any Postgres 15+).

```bash
npm install

# Start Postgres (maps to localhost:5434)
docker compose up -d

# Apply schema, RLS policies, and seed data
cp .env.example .env.local
npm run db:migrate

# Run the app
npm run dev
# -> http://localhost:3000
```

The UI has a "Simulated identity" switcher (see [Authentication
simplification](#authentication-simplification) below) — pick Alice (Acme
Corp) or Bob (Globex Inc), open an account, read its activity, and add a
note. Try opening the *other* org's account ID (shown in the UI hint) while
logged in as one identity to see the cross-tenant denial live.

### Running the automated tests

```bash
npm test
```

This resets the database, builds the app, boots it on a dedicated port,
runs the integration suite against real HTTP requests hitting a real
Postgres connection (RLS included), then tears the server down. See
[Verification](#verification) for what it proves and why integration
tests (not unit tests with a mocked DB) were the right call here.

If you don't have Docker, point `ADMIN_DATABASE_URL` / `DATABASE_URL` at
any local Postgres 15+ — the app doesn't require Docker specifically, only
a Postgres role that isn't a superuser/table-owner (see below).

## Architecture summary

```
organizations ──< memberships >── users
      │
      └──< accounts ──< activity_entries
```

- **organizations** — tenants.
- **users** / **memberships** — a user belongs to exactly one org for this
  exercise (see [Known limitations](#known-limitations)).
- **accounts** — the tenant-owned resource the activity feed is attached to.
- **activity_entries** — the feed itself: notes on an account.

**API surface** (Next.js Route Handlers under `app/api/`):

- `GET /api/accounts` — accounts visible to the caller's org.
- `GET /api/accounts/:accountId/activities` — an account plus its entries,
  newest first.
- `POST /api/accounts/:accountId/activities` — add a note. Requires an
  `Idempotency-Key` header.

All three routes require `Authorization: Bearer <token>` — see below.

## Security model

**Threat model:** a user from Organization A must not be able to read or
write Organization B's accounts or activity — even if they edit an ID in
the browser, replay a request with a different account ID, or call the API
directly with curl. The UI hiding an option is not a control; only the
server refusing the request is.

**Defense in depth, in this order:**

1. **Tenant context is never trusted from the client.** `lib/auth.ts`
   resolves `org_id` from the authenticated user's server-side membership
   record. No route handler reads an org ID from a URL param, request
   body, or header — `accountId` is the *only* client-supplied identifier,
   and every query about it is filtered by the server-derived `org_id`.
2. **Row Level Security is the actual enforcement mechanism**, not an
   application-layer `WHERE org_id = ?` clause that a future refactor could
   drop. `accounts` and `activity_entries` have RLS policies
   (`db/migrations/001_init.sql`) that filter every row by
   `current_setting('app.current_org_id')`. `lib/db.ts`'s `withOrgContext`
   sets that session variable via `SET LOCAL` inside a transaction, scoped
   from server-verified identity, before running any query.
3. **The app connects as a non-owner role (`app_user`).** RLS is bypassed
   by table owners and superusers by default — connecting as the owner
   would make the policies decorative. `FORCE ROW LEVEL SECURITY` is also
   set, so even the owner would be bound by policy if that assumption
   changes.
4. **A trigger backstops org_id/account_id consistency.**
   `enforce_activity_org_matches_account` rejects any insert/update where
   `activity_entries.org_id` doesn't match its parent account's org — belt,
   suspenders, and a second belt.
5. **Cross-tenant requests return 404, not 403.** A 403 would confirm "that
   account exists, you're just not allowed to see it" — leaking the
   existence of another org's resources. A cross-tenant read/write and a
   truly-nonexistent-ID request are indistinguishable to the caller.
6. **Least privilege at the SQL grant level.** `app_user` has no
   `UPDATE`/`DELETE` on `activity_entries` (the feed is append-only) and
   only `SELECT` on `organizations`/`users`/`memberships`.

No privileged credentials ever reach the client — the DB connection lives
only in server-side Route Handlers.

### Authentication simplification

Real login (Supabase Auth / an IdP) was out of scope for the two-hour
budget, so `lib/auth.ts` simulates it: a bearer token is treated as an
opaque, pre-issued user ID, and the server looks up that user's
organization via `memberships`. This is explicitly the kind of
simplification the assignment allows ("clearly simulate that boundary in a
test harness") — **the property being graded, tenant isolation derived
from server-side identity, is fully real and enforced by Postgres RLS.**
Swapping in real session/JWT verification only changes `authenticate()` in
`lib/auth.ts`; every route handler already treats `orgId` as opaque,
server-derived truth and would not change.

### Idempotency (duplicate-safety)

`POST .../activities` requires an `Idempotency-Key` header. The insert uses
`ON CONFLICT (account_id, idempotency_key) DO NOTHING` backed by a unique
constraint; if the insert affects zero rows (a retry), the handler fetches
and returns the *original* row with `replayed: true` and HTTP 200, instead
of erroring or silently creating a second note. First request → `201`;
identical retry → `200` with the same entry ID. Verified in
`tests/activities.integration.test.ts`.

## Completed scope

- All 5 required behaviors: read newest-first, create a note, duplicate-safe
  retry, cross-tenant read/write denial, and loading/empty/success/error UI
  states.
- RLS-enforced tenant boundary with a non-owner app role.
- Idempotent create via unique constraint + `ON CONFLICT`.
- Input validation (UUID shape, non-empty body, required idempotency key)
  with distinct 400/401/404/500 responses.
- 6 integration tests covering the happy path, both cross-tenant denial
  directions, idempotent retry, unauthenticated access, and input
  validation — run against the real built app and real Postgres.

## Known limitations

- **One org per user.** `memberships` supports multi-org membership at the
  schema level, but auth resolves the first/only membership row. A real
  version would require the client to select an active org and the server
  to verify that membership before trusting it — never trusting an org ID
  supplied without that check.
- **No real authentication.** See [above](#authentication-simplification).
- **No pagination** on the activity list — fine for a demo feed, not for a
  high-volume one.
- **No rate limiting / abuse controls** on the write path.
- **Idempotency keys never expire** — a real system would TTL or archive
  old keys; out of scope for a two-hour exercise.
- **UI is intentionally unstyled** beyond inline styles, per the assignment
  ("visual polish is not required").

## Tech choices

- **Next.js App Router + Route Handlers**, not a separate Express server —
  keeps the vertical slice to one deployable unit and one language/runtime,
  appropriate for the scope.
- **Plain `pg` over an ORM** — the entire schema is 4 tables; an ORM would
  add indirection without reducing code, and would make the RLS session
  variable (`SET LOCAL app.current_org_id`) awkward to guarantee runs
  inside the same transaction as the query it scopes.
- **Vitest + real HTTP integration tests over mocked unit tests** — the
  property under test (RLS enforcement) is a property of the *database*,
  not application logic; mocking the DB layer would prove nothing about
  the actual security boundary.
