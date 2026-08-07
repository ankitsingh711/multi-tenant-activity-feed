import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { handleRouteError } from "@/lib/api-errors";

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
