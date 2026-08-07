export type Account = { id: string; name: string };
export type ActivityEntry = {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export function listAccounts(token: string) {
  return request<{ data: Account[] }>("/api/accounts", token);
}

export function listActivities(token: string, accountId: string) {
  return request<{ data: { account: Account; activities: ActivityEntry[] } }>(
    `/api/accounts/${accountId}/activities`,
    token
  );
}

export function createActivity(
  token: string,
  accountId: string,
  bodyText: string,
  idempotencyKey: string
) {
  return request<{ data: ActivityEntry; replayed: boolean }>(
    `/api/accounts/${accountId}/activities`,
    token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ body: bodyText }),
    }
  );
}
