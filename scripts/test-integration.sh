#!/usr/bin/env bash
# Resets the DB to a known state, builds the app, boots it on a dedicated
# test port, runs the integration suite against real HTTP + real Postgres
# (RLS included), then tears the server down.
set -euo pipefail

: "${ADMIN_DATABASE_URL:=postgres://postgres:postgres@localhost:5433/activity_feed}"
: "${DATABASE_URL:=postgres://app_user:app_user_password@localhost:5433/activity_feed}"
TEST_PORT="${TEST_PORT:-4300}"
export BASE_URL="http://localhost:${TEST_PORT}"

cd "$(dirname "$0")/.."

echo "==> Resetting database"
ADMIN_DATABASE_URL="$ADMIN_DATABASE_URL" npx tsx scripts/reset.ts

echo "==> Building app"
DATABASE_URL="$DATABASE_URL" npx next build

echo "==> Starting server on :${TEST_PORT}"
DATABASE_URL="$DATABASE_URL" npx next start -p "$TEST_PORT" &
SERVER_PID=$!
trap 'echo "==> Stopping server"; kill $SERVER_PID 2>/dev/null || true' EXIT

echo "==> Waiting for server to be ready"
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${TEST_PORT}/api/accounts" -H "Authorization: Bearer aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" > /dev/null; then
    break
  fi
  sleep 1
done

echo "==> Running integration tests"
npx vitest run
