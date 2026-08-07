// Mirrors db/migrations/002_seed.sql. Used only by the demo UI's identity
// switcher, which stands in for a real login flow (see README).
export const SEED_IDENTITIES = [
  {
    token: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Alice",
    email: "alice@acme.test",
    org: "Acme Corp",
    accent: "#4f46e5",
  },
  {
    token: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: "Bob",
    email: "bob@globex.test",
    org: "Globex Inc",
    accent: "#c026d3",
  },
] as const;

// Cross-org account IDs, useful for pasting into "Open account by ID" to
// demonstrate the negative test live in the UI.
export const CROSS_TENANT_ACCOUNT_IDS = {
  acme: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  globex: "dddddddd-dddd-dddd-dddd-dddddddddddd",
} as const;
