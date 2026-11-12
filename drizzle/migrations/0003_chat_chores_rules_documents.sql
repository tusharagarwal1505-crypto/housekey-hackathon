create table public.messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  assignee_id uuid,
  assignee_name text,
  due_date date,
  repeat text not null default 'weekly',
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.house_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  body text not null,
  created_by_name text not null,
  agreed_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  kind text not null default 'Other',
  storage_path text,
  uploaded_by uuid not null default auth.uid(),
  uploaded_by_name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages, public.chores, public.house_rules, public.documents to authenticated;
grant all on public.messages, public.chores, public.house_rules, public.documents to service_role;
alter table public.messages enable row level security;
alter table public.chores enable row level security;
alter table public.house_rules enable row level security;
alter table public.documents enable row level security;

create policy "members read messages" on public.messages for select to authenticated using (public.is_member(property_id));
create policy "members post messages" on public.messages for insert to authenticated with check (public.is_member(property_id) and sender_id = auth.uid());
create policy "authors delete messages" on public.messages for delete to authenticated using (sender_id = auth.uid());

create policy "members read chores" on public.chores for select to authenticated using (public.is_member(property_id));
create policy "members add chores" on public.chores for insert to authenticated with check (public.is_member(property_id));
create policy "members update chores" on public.chores for update to authenticated using (public.is_member(property_id)) with check (public.is_member(property_id));
create policy "members delete chores" on public.chores for delete to authenticated using (public.is_member(property_id));

create policy "members read rules" on public.house_rules for select to authenticated using (public.is_member(property_id));
create policy "members add rules" on public.house_rules for insert to authenticated with check (public.is_member(property_id));
create policy "members update rules" on public.house_rules for update to authenticated using (public.is_member(property_id)) with check (public.is_member(property_id));
create policy "owners delete rules" on public.house_rules for delete to authenticated using (public.is_owner(property_id));

create policy "members read documents" on public.documents for select to authenticated using (public.is_member(property_id) or (public.was_tenant(property_id) and uploaded_by = auth.uid()));
create policy "members add documents" on public.documents for insert to authenticated with check (public.is_member(property_id) and uploaded_by = auth.uid());
create policy "owner or uploader delete documents" on public.documents for delete to authenticated using (public.is_owner(property_id) or uploaded_by = auth.uid());

-- Owner sends a reminder notification to a tenant of their property.
create or replace function public.send_reminder(_tenancy uuid, _body text) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from public.tenancies where id = _tenancy;
  if t is null or not public.is_owner(t.property_id) then raise exception 'Not allowed'; end if;
  if t.tenant_id is null then raise exception 'This tenant has no HouseKey account yet'; end if;
  insert into public.notifications(user_id, body) values (t.tenant_id, left(_body, 500));
end $$;
revoke execute on function public.send_reminder(uuid, text) from public, anon;
grant execute on function public.send_reminder(uuid, text) to authenticated;

-- Private document files: path starts with the property id.
create policy "members read document files" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "members upload document files" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "owners delete document files" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (public.is_owner(((storage.foldername(name))[1])::uuid) or owner = auth.uid()));