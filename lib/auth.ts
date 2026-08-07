import { NextRequest } from "next/server";
import { getPool } from "./db";

export type AuthContext = {
  userId: string;
  email: string;
  orgId: string;
};

export class UnauthorizedError extends Error {}

export async function authenticate(req: NextRequest): Promise<AuthContext> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const { rows } = await getPool().query<{
    user_id: string;
    email: string;
    org_id: string;
  }>(
    `select u.id as user_id, u.email, m.org_id
       from users u
       join memberships m on m.user_id = u.id
      where u.id = $1
      limit 1`,
    [token]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError("Invalid token");
  }

  return { userId: rows[0].user_id, email: rows[0].email, orgId: rows[0].org_id };
}
