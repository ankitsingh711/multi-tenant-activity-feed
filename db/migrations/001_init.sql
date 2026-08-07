-- Multi-tenant Account Activity Feed: schema, tenant boundary, idempotency
-- Enforcement strategy: Postgres Row Level Security (RLS) scoped to a
-- per-request session variable (app.current_org_id) that the API server
-- sets ONLY from server-verified identity (see lib/db.ts withOrgContext).
-- The application connects as `app_user`, a non-superuser/non-owner role,
-- because RLS is bypassed by table owners and superusers.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz not null default now()
);

-- Maps an authenticated user to exactly one organization for this exercise.
-- (Real multi-org membership would add a role column and drop the implicit
-- "one org per user" assumption; see README "Known limitations".)
create table memberships (
  user_id     uuid not null references users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  role        text not null default 'member',
  primary key (user_id, org_id)
);

create table accounts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table activity_entries (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  -- Denormalized org_id lets RLS filter this table directly (no join needed
  -- in the policy) and lets the DB itself guarantee account/org consistency
  -- via the trigger below.
  org_id           uuid not null references organizations(id) on delete cascade,
  body             text not null check (char_length(btrim(body)) > 0),
  created_by       uuid not null references users(id),
  idempotency_key  text not null,
  created_at       timestamptz not null default now(),
  -- Duplicate-safety: a retried create request (same account + same
  -- idempotency key) can never produce a second row.
  unique (account_id, idempotency_key)
);

create index idx_activity_entries_account_created
  on activity_entries (account_id, created_at desc);

-- Guarantee org_id on activity_entries always matches the parent account's
-- org_id, even if a future caller passes a mismatched value.
create or replace function enforce_activity_org_matches_account()
returns trigger as $$
begin
  if new.org_id <> (select org_id from accounts where id = new.account_id) then
    raise exception 'org_id % does not match owning account''s organization', new.org_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_activity_org_matches_account
  before insert or update on activity_entries
  for each row execute function enforce_activity_org_matches_account();

-- ---------------------------------------------------------------------------
-- Row Level Security: the tenant boundary
-- ---------------------------------------------------------------------------

alter table accounts enable row level security;
alter table accounts force row level security;
alter table activity_entries enable row level security;
alter table activity_entries force row level security;

create policy accounts_tenant_isolation on accounts
  using (org_id = current_setting('app.current_org_id', true)::uuid)
  with check (org_id = current_setting('app.current_org_id', true)::uuid);

create policy activity_entries_tenant_isolation on activity_entries
  using (org_id = current_setting('app.current_org_id', true)::uuid)
  with check (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Application role (least privilege, RLS-bound)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login password 'app_user_password';
  end if;
end
$$;

grant usage on schema public to app_user;
grant select on organizations, users, memberships to app_user;
grant select, insert on accounts to app_user;
grant select, insert on activity_entries to app_user;
