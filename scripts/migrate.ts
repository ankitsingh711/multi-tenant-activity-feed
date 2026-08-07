import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const migrationsDir = path.join(__dirname, "..", "db", "migrations");

// Runs as the DB owner (postgres) because 001_init.sql creates the
// least-privilege `app_user` role that the application itself connects as.
const adminUrl =
  process.env.ADMIN_DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5433/activity_feed";

async function main() {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query(sql);
  }

  console.log("Migrations complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
