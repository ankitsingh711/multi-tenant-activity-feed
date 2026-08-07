# Time Log

Two-hour budget, tracked against the assignment's recommended allocation.

| Time        | Focus                    | What happened |
|-------------|---------------------------|----------------|
| 0:00–0:15   | Plan and model             | Read the assignment, chose the schema (organizations, users, memberships, accounts, activity_entries), decided RLS + non-owner DB role as the enforcement mechanism, and idempotency via a unique constraint + `ON CONFLICT`. |
| 0:15–0:45   | Data and security           | Wrote the migration (schema, RLS policies, `app_user` role, org-match trigger) and seed data. Verified tenant isolation directly in `psql` before writing any application code. |
| 0:45–1:10   | Vertical slice (backend)    | Built the API. **Mid-flight stack change:** the backend was originally an Express server with a plain-React frontend, fully built and manually verified end-to-end (RLS, idempotency, cross-tenant denial all confirmed). Told to rebuild on Next.js + TypeScript instead — removed the Express/React code and rebuilt the same design as Next.js Route Handlers (`app/api/...`) plus `lib/db.ts` / `lib/auth.ts`. |
| 1:10–1:30   | Vertical slice (frontend)   | Built `app/page.tsx`: identity switcher (simulated auth), account picker, activity list, note form, loading/empty/success/error states. |
| 1:30–1:50   | Verification                | Wrote `tests/activities.integration.test.ts` (6 tests) and `scripts/test-integration.sh` (reset → build → boot → test → teardown). Fixed one lint violation (`react-hooks/set-state-in-effect`) surfaced by this pass by restructuring identity-switch state instead of suppressing the rule. All tests green against the real built app + real Postgres. |
| 1:50–2:00+  | Handoff                     | README (architecture, security model, known limitations), AI_USAGE.md, this time log. *(This step ran over the strict two-hour mark to produce complete documentation — see note below.)* |

**Note on the stack change:** the Express→Next.js rebuild was requested
after the original implementation was already complete and verified. That
rebuild reused the same schema, security model, and verification approach
and did not require redesigning anything — it re-cost time (roughly the
0:45–1:30 block above) that in a strict single-pass two-hour run would have
gone toward broader test coverage or the multi-org-membership limitation
noted in the README. Flagging this rather than quietly absorbing it, per
the assignment's instruction to document intended-but-skipped work.
