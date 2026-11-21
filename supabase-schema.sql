create table public.kos_puji_owners (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.kos_puji_owners enable row level security;
revoke all on public.kos_puji_owners from anon, authenticated;
grant select on public.kos_puji_owners to authenticated;
create policy kos_puji_owner_self on public.kos_puji_owners for select to authenticated
 using (user_id = (select auth.uid()));
-- Owner Kos Puji didaftarkan manual, terpisah dari owner Lokalin:
-- insert into public.kos_puji_owners(user_id) values ('<user_id>') on conflict do nothing;

create table public.kos_puji_data (
 user_id uuid primary key references public.kos_puji_owners(user_id) on delete cascade,
 payload jsonb not null default '{"rooms":[],"bills":{},"expenses":[]}'::jsonb,
 revision bigint not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now(),
 constraint kos_puji_payload_structure check (
 jsonb_typeof(payload)='object'
 and payload ?& array['rooms','bills','expenses']
 and jsonb_typeof(payload->'rooms')='array'
 and jsonb_typeof(payload->'bills')='object'
 and jsonb_typeof(payload->'expenses')='array'
 )
);
alter table public.kos_puji_data enable row level security;
revoke all on public.kos_puji_data from anon, authenticated;
grant select on public.kos_puji_data to authenticated;
grant update(payload,revision,updated_at) on public.kos_puji_data to authenticated;
create policy kos_puji_data_read on public.kos_puji_data for select to authenticated
 using (user_id=(select auth.uid()));
create policy kos_puji_data_write on public.kos_puji_data for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));
insert into public.kos_puji_data(user_id) select user_id from public.kos_puji_owners;

