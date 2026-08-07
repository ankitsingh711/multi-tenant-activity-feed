// Drops all app objects and re-applies migrations, so tests and local dev
// start from a known, deterministic state.
import { Client } from "pg";
import { spawnSync } from "node:child_process";
import path from "node:path";

const adminUrl =
  process.env.ADMIN_DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5433/activity_feed";

async function main() {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  await client.query(`
    drop table if exists activity_entries cascade;
    drop table if exists accounts cascade;
    drop table if exists memberships cascade;
    drop table if exists users cascade;
    drop table if exists organizations cascade;
    drop function if exists enforce_activity_org_matches_account cascade;
  `);
  await client.end();

  const result = spawnSync("npx", ["tsx", "scripts/migrate.ts"], {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
