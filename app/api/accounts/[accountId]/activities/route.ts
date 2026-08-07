import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActivityEntry = {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
};

// GET /api/accounts/:accountId/activities — list entries, newest first.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  if (!UUID_RE.test(accountId)) {
    return jsonError(400, "invalid_request", "accountId must be a UUID");
  }

  try {
    const auth = await authenticate(req);

    const result = await withOrgContext(auth.orgId, async (client) => {
      // RLS scopes this to auth.orgId. A cross-tenant accountId simply
      // matches zero rows here — same response shape as "doesn't exist",
      // which avoids confirming another org's account IDs to the caller.
      const account = await client.query<{ id: string; name: string }>(
        "select id, name from accounts where id = $1",
        [accountId]
      );
      if (account.rowCount === 0) return { notFound: true as const };

      const activities = await client.query<ActivityEntry>(
        `select id, body, created_by, created_at
           from activity_entries
          where account_id = $1
          order by created_at desc`,
        [accountId]
      );
      return {
        notFound: false as const,
        account: account.rows[0],
        activities: activities.rows,
      };
    });

    if (result.notFound) {
      return jsonError(404, "not_found", "Account not found");
    }
    return NextResponse.json({
      data: { account: result.account, activities: result.activities },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/accounts/:accountId/activities — add a note, idempotent by
// request (Idempotency-Key header).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  if (!UUID_RE.test(accountId)) {
    return jsonError(400, "invalid_request", "accountId must be a UUID");
  }

  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return jsonError(
      400,
      "invalid_request",
      "Idempotency-Key header is required"
    );
  }

  let body: string | undefined;
  try {
    const json = await req.json();
    body = typeof json?.body === "string" ? json.body : undefined;
  } catch {
    return jsonError(400, "invalid_request", "Request body must be JSON");
  }
  if (!body || !body.trim()) {
    return jsonError(400, "invalid_request", "body must be non-empty text");
  }
  const trimmedBody = body.trim();

  try {
    const auth = await authenticate(req);

    const result = await withOrgContext(auth.orgId, async (client) => {
      // Same RLS-backed existence check as GET: writing to an account we
      // can't see must fail exactly like writing to one that doesn't exist.
      const account = await client.query("select id from accounts where id = $1", [
        accountId,
      ]);
      if (account.rowCount === 0) return { notFound: true as const };

      // org_id is taken from server-verified auth, never from the client,
      // so a caller cannot forge writes into another org even if accountId
      // somehow matched (it can't, per the check above + RLS).
      const insert = await client.query<ActivityEntry>(
        `insert into activity_entries (account_id, org_id, body, created_by, idempotency_key)
         values ($1, $2, $3, $4, $5)
         on conflict (account_id, idempotency_key) do nothing
         returning id, body, created_by, created_at`,
        [accountId, auth.orgId, trimmedBody, auth.userId, idempotencyKey]
      );

      if (insert.rowCount && insert.rowCount > 0) {
        return { notFound: false as const, entry: insert.rows[0], replayed: false };
      }

      // Conflict: this exact (account, idempotency key) pair already
      // exists. Return the original entry instead of erroring, so retries
      // are safe and observably return the same result.
      const existing = await client.query<ActivityEntry>(
        `select id, body, created_by, created_at
           from activity_entries
          where account_id = $1 and idempotency_key = $2`,
        [accountId, idempotencyKey]
      );
      return { notFound: false as const, entry: existing.rows[0], replayed: true };
    });

    if (result.notFound) {
      return jsonError(404, "not_found", "Account not found");
    }
    return NextResponse.json(
      { data: result.entry, replayed: result.replayed },
      { status: result.replayed ? 200 : 201 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
