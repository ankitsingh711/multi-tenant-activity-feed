"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Account, ActivityEntry, ApiError, createActivity } from "@/lib/api-client";
import { initials, relativeTime } from "@/lib/format";
import { SEED_IDENTITIES } from "@/lib/seed-identities";
import { FeedState, useAccountWorkspace } from "@/lib/use-account-workspace";

export default function Home() {
  const [token, setToken] = useState<string>(SEED_IDENTITIES[0].token);
  const identity = SEED_IDENTITIES.find((i) => i.token === token)!;
  const workspace = useAccountWorkspace(token);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-border bg-surface p-5 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center text-accent-ink text-sm font-bold">
            A
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Activity Feed</h1>
            <p className="text-xs text-ink-muted leading-tight">Multi-tenant demo</p>
          </div>
        </div>

        <IdentitySwitcher token={token} onChange={setToken} />

        <div>
          <p className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-wide">
            {identity.org} accounts
          </p>

          {workspace.accountsError && (
            <p className="text-sm text-danger rounded-md bg-danger-bg px-2.5 py-2">
              {workspace.accountsError}
            </p>
          )}

          {workspace.accounts === null && !workspace.accountsError && (
            <div className="flex flex-col gap-1.5">
              <div className="skeleton h-9 rounded-lg" />
              <div className="skeleton h-9 rounded-lg" />
            </div>
          )}

          {workspace.accounts?.length === 0 && (
            <p className="text-sm text-ink-muted">No accounts for this organization.</p>
          )}

          <div className="flex flex-col gap-1">
            {workspace.accounts?.map((a) => (
              <button
                key={a.id}
                onClick={() => workspace.openAccount(a.id)}
                className={`rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  a.id === workspace.selectedAccountId
                    ? "bg-canvas font-medium"
                    : "hover:bg-canvas text-ink-muted"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <ManualOpen identityName={identity.name} onOpen={workspace.openAccount} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <FeedPanel
          feed={workspace.feed}
          token={token}
          onAfterSubmit={() => workspace.openAccount(workspace.selectedAccountId)}
        />
      </main>
    </div>
  );
}

function IdentitySwitcher({
  token,
  onChange,
}: {
  token: string;
  onChange: (token: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-wide">
        Simulated identity
      </p>
      <div className="flex flex-col gap-1.5">
        {SEED_IDENTITIES.map((id) => {
          const active = id.token === token;
          return (
            <button
              key={id.token}
              onClick={() => onChange(id.token)}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                active ? "border-accent bg-accent/10" : "border-transparent hover:bg-canvas"
              }`}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: id.accent }}
              >
                {initials(id.name)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{id.name}</span>
                <span className="block text-xs text-ink-muted truncate">{id.org}</span>
              </span>
              {active && (
                <svg className="ml-auto h-4 w-4 shrink-0 text-accent" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ManualOpen({
  identityName,
  onOpen,
}: {
  identityName: string;
  onOpen: (accountId: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="mt-auto pt-4 border-t border-border">
      <button
        onClick={() => setShow((s) => !s)}
        className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
      >
        <svg
          className={`h-3 w-3 transition-transform ${show ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.3 14.7a1 1 0 010-1.4L10.6 10 7.3 6.7a1 1 0 011.4-1.4l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4 0z"
            clipRule="evenodd"
          />
        </svg>
        Open account by ID
      </button>
      {show && (
        <div className="mt-2 flex gap-1.5 animate-in">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="account UUID"
            className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1.5 text-xs font-mono outline-none focus:border-accent"
          />
          <button
            onClick={() => onOpen(value)}
            className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-canvas"
          >
            Open
          </button>
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-ink-muted">
        Try pasting the other org&apos;s account ID here while signed in as {identityName} — the
        API returns 404, proving the boundary is enforced server-side, not just hidden by this
        picker.
      </p>
    </div>
  );
}

function FeedPanel({
  feed,
  token,
  onAfterSubmit,
}: {
  feed: FeedState;
  token: string;
  onAfterSubmit: () => void;
}) {
  if (feed.status === "idle") {
    return (
      <EmptyShell
        title="Select an account"
        subtitle="Pick an account from the sidebar to view its activity."
      />
    );
  }
  if (feed.status === "loading") return <LoadingShell />;
  if (feed.status === "error") return <ErrorShell message={feed.message} />;
  return (
    <FeedContent
      account={feed.account}
      activities={feed.activities}
      token={token}
      onAfterSubmit={onAfterSubmit}
    />
  );
}

function EmptyShell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
      <div className="h-12 w-12 rounded-full bg-surface border border-border flex items-center justify-center text-ink-muted">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm4 3a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h3a1 1 0 100-2H7z" />
        </svg>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-ink-muted max-w-xs">{subtitle}</p>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="skeleton h-5 w-40 rounded" />
      </div>
      <div className="flex-1 p-6 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2 pt-1">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="h-12 w-12 rounded-full bg-danger-bg flex items-center justify-center text-danger">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.3 3.3a1.5 1.5 0 013.4 0l6.5 11.3a1.5 1.5 0 01-1.3 2.4H3.1a1.5 1.5 0 01-1.3-2.4L8.3 3.3zM10 8a1 1 0 00-1 1v3a1 1 0 102 0V9a1 1 0 00-1-1zm0 7a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p role="alert" className="text-sm font-medium">
        {message}
      </p>
    </div>
  );
}

function FeedContent({
  account,
  activities,
  token,
  onAfterSubmit,
}: {
  account: Account;
  activities: ActivityEntry[];
  token: string;
  onAfterSubmit: () => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || submitting) return;
    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID();
    try {
      const res = await createActivity(token, account.id, noteText.trim(), idempotencyKey);
      setNoteText("");
      setBanner({
        kind: "success",
        text: res.replayed ? "Duplicate submission ignored (idempotent replay)." : "Note added.",
      });
      onAfterSubmit();
    } catch (err) {
      setBanner({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Failed to submit note",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{account.name}</h2>
          <p className="text-xs text-ink-muted">
            {activities.length} {activities.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activities.length === 0 ? (
          <EmptyShell
            title="No activity yet"
            subtitle="Notes added to this account will show up here, newest first."
          />
        ) : (
          <ol className="flex flex-col gap-5">
            {activities.map((entry, i) => (
              <li
                key={entry.id}
                className="flex gap-3 animate-in"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 012-2h6l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm7 0v3a1 1 0 001 1h3l-4-4z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs text-ink-muted"
                    title={new Date(entry.created_at).toLocaleString()}
                  >
                    {relativeTime(entry.created_at)}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {entry.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-border bg-surface px-6 py-4">
        {banner && (
          <div
            role={banner.kind === "error" ? "alert" : "status"}
            className={`mb-3 rounded-md px-3 py-2 text-xs animate-in ${
              banner.kind === "error" ? "bg-danger-bg text-danger" : "bg-success-bg text-success"
            }`}
          >
            {banner.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                textareaRef.current?.form?.requestSubmit();
              }
            }}
            placeholder="Add a note… (⌘/Ctrl + Enter to submit)"
            rows={2}
            disabled={submitting}
            className="min-w-0 flex-1 resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting || !noteText.trim()}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-40"
          >
            {submitting ? "Adding…" : "Add note"}
          </button>
        </form>
      </div>
    </>
  );
}
