import { useEffect, useState } from "react";
import { Account, ActivityEntry, ApiError, listAccounts, listActivities } from "./api-client";

export type FeedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; account: Account; activities: ActivityEntry[] };

/**
 * Owns every piece of state that's per-identity (accounts, the currently
 * open account, and its feed) so the sidebar and the main panel — which
 * live as siblings in the layout, not parent/child — can share it without
 * prop-drilling through a wrapper that would force a particular DOM shape.
 */
export function useAccountWorkspace(token: string) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [feed, setFeed] = useState<FeedState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    listAccounts(token)
      .then((res) => {
        if (cancelled) return;
        setAccounts(res.data);
        if (res.data.length > 0) openAccount(res.data[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          setAccountsError(err instanceof ApiError ? err.message : "Failed to load accounts");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openAccount(accountId: string) {
    if (!accountId) return;
    setSelectedAccountId(accountId);
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

  return { accounts, accountsError, selectedAccountId, feed, openAccount };
}
