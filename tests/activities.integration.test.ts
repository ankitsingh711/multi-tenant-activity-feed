import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4300";

const ALICE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // Acme Corp
const BOB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // Globex Inc
const ACME_ACCOUNT = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const GLOBEX_ACCOUNT = "dddddddd-dddd-dddd-dddd-dddddddddddd";

function authed(token: string, init: RequestInit = {}) {
  return {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  };
}

async function json(res: Response) {
  return res.json();
}

describe("account activity feed", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/accounts`, authed(ALICE));
    if (!res.ok) {
      throw new Error(
        `Server not reachable at ${BASE_URL} (status ${res.status}). Is scripts/test-integration.sh running it?`
      );
    }
  });

  it("rejects requests with no bearer token", async () => {
    const res = await fetch(`${BASE_URL}/api/accounts`);
    expect(res.status).toBe(401);
  });

  it("lets a user read and create activity on their own org's account (happy path)", async () => {
    const listRes = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE)
    );
    expect(listRes.status).toBe(200);
    const before = await json(listRes);
    expect(before.data.account.id).toBe(ACME_ACCOUNT);
    const countBefore = before.data.activities.length;

    const createRes = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
        body: JSON.stringify({ body: "Happy path note" }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = await json(createRes);
    expect(created.data.body).toBe("Happy path note");
    expect(created.replayed).toBe(false);

    const listAfter = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE)
    );
    const after = await json(listAfter);
    expect(after.data.activities.length).toBe(countBefore + 1);
    // Newest first.
    expect(after.data.activities[0].body).toBe("Happy path note");
  });

  it("denies cross-tenant reads: Alice (Acme) cannot read Globex's account", async () => {
    const res = await fetch(
      `${BASE_URL}/api/accounts/${GLOBEX_ACCOUNT}/activities`,
      authed(ALICE)
    );
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe("not_found");
  });

  it("denies cross-tenant writes: Bob (Globex) cannot post a note to Acme's account", async () => {
    const res = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(BOB, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
        body: JSON.stringify({ body: "should never land" }),
      })
    );
    expect(res.status).toBe(404);

    // Verify no row was written by reading back as the legitimate owner.
    const listRes = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE)
    );
    const list = await json(listRes);
    expect(
      list.data.activities.some((a: { body: string }) => a.body === "should never land")
    ).toBe(false);
  });

  it("is duplicate-safe: retrying the same create request does not create a duplicate", async () => {
    const idempotencyKey = randomUUID();
    const payload = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ body: "Retry-safe note" }),
    };

    const first = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE, payload)
    );
    expect(first.status).toBe(201);
    const firstBody = await json(first);
    expect(firstBody.replayed).toBe(false);

    const retry = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE, payload)
    );
    expect(retry.status).toBe(200);
    const retryBody = await json(retry);
    expect(retryBody.replayed).toBe(true);
    expect(retryBody.data.id).toBe(firstBody.data.id);

    const listRes = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE)
    );
    const list = await json(listRes);
    const matches = list.data.activities.filter(
      (a: { body: string }) => a.body === "Retry-safe note"
    );
    expect(matches.length).toBe(1);
  });

  it("validates input: rejects empty note body and missing Idempotency-Key", async () => {
    const noKey = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "no key" }),
      })
    );
    expect(noKey.status).toBe(400);

    const emptyBody = await fetch(
      `${BASE_URL}/api/accounts/${ACME_ACCOUNT}/activities`,
      authed(ALICE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
        body: JSON.stringify({ body: "   " }),
      })
    );
    expect(emptyBody.status).toBe(400);
  });
});
