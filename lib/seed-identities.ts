// Mirrors db/migrations/002_seed.sql. Used only by the demo UI's identity
// switcher, which stands in for a real login flow (see README).
export const SEED_IDENTITIES = [
  {
    token: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    label: "Alice — Acme Corp",
  },
  {
    token: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    label: "Bob — Globex Inc",
  },
] as const;

// Cross-org account IDs, useful for pasting into "Open account by ID" to
// demonstrate the negative test live in the UI.
export const CROSS_TENANT_ACCOUNT_IDS = {
  acme: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  globex: "dddddddd-dddd-dddd-dddd-dddddddddddd",
} as const;
