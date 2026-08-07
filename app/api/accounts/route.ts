import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { handleRouteError } from "@/lib/api-errors";

// GET /api/accounts — accounts visible to the caller's org. Populates the
// frontend's account picker. Scoped through withOrgContext so RLS (not a
// WHERE clause) is what actually bounds the result set.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    const rows = await withOrgContext(auth.orgId, (client) =>
      client
        .query<{ id: string; name: string }>(
          "select id, name from accounts order by name"
        )
        .then((r) => r.rows)
    );
    return NextResponse.json({ data: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}
