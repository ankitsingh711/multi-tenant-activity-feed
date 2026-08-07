"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Account,
  ActivityEntry,
  ApiError,
  createActivity,
  listAccounts,
  listActivities,
} from "@/lib/api-client";
import { SEED_IDENTITIES } from "@/lib/seed-identities";

type FeedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; account: Account; activities: ActivityEntry[] };

export default function Home() {
  const [token, setToken] = useState<string>(SEED_IDENTITIES[0].token);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem" }}>Account Activity Feed</h1>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        Secure multi-tenant demo. Switch identity below to see tenant isolation enforced
        server-side (via Postgres RLS) — not just hidden in the UI.
      </p>

      <label style={{ display: "block", fontWeight: 600, marginTop: "1.5rem", marginBottom: 4 }}>
        Simulated identity
      </label>
      <select value={token} onChange={(e) => setToken(e.target.value)}>
        {SEED_IDENTITIES.map((id) => (
          <option key={id.token} value={id.token}>
            {id.label}
          </option>
        ))}
      </select>
      <AccountWorkspace key={token} token={token} />
    </main>
  );
}

function AccountWorkspace({ token }: { token: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [manualAccountId, setManualAccountId] = useState<string>("");
  const [feed, setFeed] = useState<FeedState>({ status: "idle" });
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAccounts(token)
      .then((res) => {
        if (!cancelled) setAccounts(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setAccountsError(err instanceof ApiError ? err.message : "Failed to load accounts");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function openAccount(accountId: string) {
    if (!accountId) return;
    setSelectedAccountId(accountId);
    setSubmitNote(null);
    setFeed({ status: "loading" });
    listActivities(token, accountId)
      .then((res) =>
        setFeed({ status: "success", account: res.data.account, activities: res.data.activities })
      )
      .catch((err) =>
        setFeed({
          status: "error",
          message: err instanceof ApiError ? err.message : "Failed to load activity feed",
        })
      );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !noteText.trim() || submitting) return;
    setSubmitting(true);
    setSubmitNote(null);
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await createActivity(token, selectedAccountId, noteText.trim(), idempotencyKey);
      setNoteText("");
      setSubmitNote(res.replayed ? "Duplicate submission ignored (idempotent replay)." : "Note added.");
      openAccount(selectedAccountId);
    } catch (err) {
      setSubmitNote(err instanceof ApiError ? `Error: ${err.message}` : "Error: failed to submit note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section style={{ marginTop: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
        {accountsError && <p style={{ color: "#b00020" }}>Error: {accountsError}</p>}

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Your accounts
          </label>
          {accounts.length === 0 && !accountsError && <p style={{ color: "#777" }}>Loading…</p>}
          <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {accounts.map((a) => (
              <li key={a.id}>
                <button onClick={() => openAccount(a.id)} disabled={a.id === selectedAccountId}>
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Open account by ID (try pasting another org&apos;s account ID)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1 }}
              value={manualAccountId}
              onChange={(e) => setManualAccountId(e.target.value)}
              placeholder="account UUID"
            />
            <button onClick={() => openAccount(manualAccountId)}>Open</button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        {feed.status === "idle" && <p style={{ color: "#777" }}>Select an account to view its activity.</p>}
        {feed.status === "loading" && <p>Loading activity…</p>}
        {feed.status === "error" && (
          <p style={{ color: "#b00020" }} role="alert">
            Error: {feed.message}
          </p>
        )}
        {feed.status === "success" && (
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>{feed.account.name}</h2>

            {feed.activities.length === 0 ? (
              <p style={{ color: "#777" }}>No activity yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {feed.activities.map((entry) => (
                  <li
                    key={entry.id}
                    style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}
                  >
                    <div>{entry.body}</div>
                    <div style={{ fontSize: "0.75rem", color: "#999" }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1 }}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                disabled={submitting}
              />
              <button type="submit" disabled={submitting || !noteText.trim()}>
                {submitting ? "Submitting…" : "Add note"}
              </button>
            </form>
            {submitNote && (
              <p style={{ color: submitNote.startsWith("Error") ? "#b00020" : "#2e7d32" }}>
                {submitNote}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
