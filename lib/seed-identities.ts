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

export const CROSS_TENANT_ACCOUNT_IDS = {
  acme: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  globex: "dddddddd-dddd-dddd-dddd-dddddddddddd",
} as const;
