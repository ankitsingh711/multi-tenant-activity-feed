import { Pool, PoolClient } from "pg";

// Connects as `app_user` — a least-privilege, non-owner role — so that Row
// Level Security policies are actually enforced. Superusers and table
// owners silently bypass RLS, which would defeat the tenant boundary.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://app_user:app_user_password@localhost:5433/activity_feed",
      max: 10,
    });
  }
  return pool;
}

/**
 * Runs `fn` inside a transaction with `app.current_org_id` set via
 * SET LOCAL (through set_config(..., true)), scoping every RLS-protected
 * query in `fn` to that tenant. `orgId` must come from server-verified
 * identity (see lib/auth.ts), never from client input.
 */
export async function withOrgContext<T>(
  orgId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_org_id', $1, true)", [
      orgId,
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
