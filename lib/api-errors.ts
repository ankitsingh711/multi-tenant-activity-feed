import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

/** Maps a caught error to the right HTTP response, logging server errors. */
export function handleRouteError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return jsonError(401, "unauthorized", err.message);
  }
  console.error(err);
  return jsonError(500, "server_error", "Unexpected error");
}
