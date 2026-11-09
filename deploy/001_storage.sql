-- Run once in YOUR Supabase SQL editor. Contains no credentials or real data.
begin;
create table if not exists public.pulp_kv (
 key text primary key check (key ~ '^[a-zA-Z0-9:_-]{1,220}$'),
 value jsonb not null,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.pulp_kv enable row level security;
revoke all on public.pulp_kv from public, anon, authenticated;
grant all on public.pulp_kv to service_role;
create or replace function public.pulp_kv_put(p_key text,p_value jsonb) returns void
language sql security invoker set search_path=public as $$
 insert into public.pulp_kv(key,value) values(p_key,p_value)
 on conflict(key) do update set value=excluded.value,revision=pulp_kv.revision+1,updated_at=now();
$$;
create or replace function public.pulp_kv_cas(p_key text,p_revision bigint,p_value jsonb) returns boolean
language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 if p_revision = -1 then
  insert into public.pulp_kv(key,value) values(p_key,p_value) on conflict do nothing;
 else
  update public.pulp_kv set value=p_value,revision=revision+1,updated_at=now() where key=p_key and revision=p_revision;
 end if;
 get diagnostics n = row_count;
 return n = 1;
end;
$$;
revoke all on function public.pulp_kv_put(text,jsonb) from public,anon,authenticated;
revoke all on function public.pulp_kv_cas(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.pulp_kv_put(text,jsonb) to service_role;
grant execute on function public.pulp_kv_cas(text,bigint,jsonb) to service_role;
commit;
