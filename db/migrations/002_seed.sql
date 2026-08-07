insert into organizations (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Inc');

insert into users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@acme.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@globex.test');

insert into memberships (user_id, org_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222');

insert into accounts (id, org_id, name) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Acme Flagship Account'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Globex Flagship Account');

-- Seed one activity entry per account so the "read" path has data on first run.
insert into activity_entries (account_id, org_id, body, created_by, idempotency_key) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
   'Account created.', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'seed-acme-1'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222',
   'Account created.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'seed-globex-1');
