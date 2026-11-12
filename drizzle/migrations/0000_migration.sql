create type public.app_role as enum ('landlord', 'tenant', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

-- Users may self-assign landlord or tenant (never admin).
create or replace function public.claim_role(_role public.app_role)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if _role = 'admin' then raise exception 'not allowed'; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), _role) on conflict do nothing;
end $$;
revoke all on function public.claim_role(public.app_role) from public, anon;
grant execute on function public.claim_role(public.app_role) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  address text not null default '',
  photo_url text,
  rent_day int not null default 1,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 4) || '-' || substr(md5(random()::text), 1, 4)),
  created_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  rent numeric(10,2) not null default 0,
  deposit numeric(10,2) not null default 0,
  weight numeric(5,2) not null default 1,
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  tenant_id uuid,
  tenant_name text not null,
  tenant_email text,
  start_date date not null,
  end_date date,
  proposed_end_date date,
  status text not null default 'active' check (status in ('active','moveout_requested','ended')),
  created_at timestamptz not null default now()
);

create or replace function public.is_owner(_pid uuid) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.properties where id = _pid and owner_id = auth.uid()) $$;
create or replace function public.is_active_tenant(_pid uuid) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.tenancies where property_id = _pid and tenant_id = auth.uid() and status <> 'ended') $$;
create or replace function public.is_member(_pid uuid) returns boolean language sql stable security definer set search_path = public
as $$ select public.is_owner(_pid) or public.is_active_tenant(_pid) $$;

grant select, insert, update, delete on public.properties, public.rooms, public.tenancies to authenticated;
grant all on public.properties, public.rooms, public.tenancies to service_role;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.tenancies enable row level security;

create policy "members read property" on public.properties for select to authenticated using (owner_id = auth.uid() or public.is_active_tenant(id));
create policy "landlords create property" on public.properties for insert to authenticated with check (owner_id = auth.uid() and public.has_role(auth.uid(), 'landlord'));
create policy "owner updates property" on public.properties for update to authenticated using (owner_id = auth.uid());
create policy "owner deletes property" on public.properties for delete to authenticated using (owner_id = auth.uid());

create policy "members read rooms" on public.rooms for select to authenticated using (public.is_member(property_id));
create policy "owner writes rooms" on public.rooms for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

create policy "read tenancies" on public.tenancies for select to authenticated using (public.is_member(property_id) or tenant_id = auth.uid());
create policy "owner writes tenancies" on public.tenancies for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

-- Tenant may propose a move-out date on their own tenancy (nothing else).
create or replace function public.request_moveout(_tenancy uuid, _date date)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.tenancies set proposed_end_date = _date, status = 'moveout_requested'
  where id = _tenancy and tenant_id = auth.uid() and status = 'active';
  if not found then raise exception 'tenancy not found'; end if;
  insert into public.audit_logs(property_id, actor_id, action)
  select property_id, auth.uid(), 'Requested move-out for ' || _date from public.tenancies where id = _tenancy;
end $$;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  bill_type text not null default 'Other',
  provider text not null,
  total numeric(10,2) not null,
  start_date date not null,
  end_date date not null,
  reference text,
  source text not null default 'Manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  payer_id uuid,
  payer_name text not null,
  payee_name text not null,
  category text not null check (category in ('Rent','Deposit','Utility','Settlement','Expense','Refund')),
  description text not null,
  amount numeric(10,2) not null,
  status text not null default 'Pending' check (status in ('Pending','Paid','Failed','Refunded')),
  method text not null default 'PayPal',
  reference text not null default 'PAYID-' || upper(substr(md5(random()::text), 1, 10)),
  bill_id uuid references public.bills(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  amount numeric(10,2) not null,
  status text not null default 'held' check (status in ('awaiting','held','refund_due','returned')),
  created_at timestamptz not null default now()
);
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  tenant_id uuid,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','approved','paid')),
  created_at timestamptz not null default now()
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  applicant_id uuid default auth.uid(),
  applicant_name text not null,
  applicant_email text,
  message text,
  move_in date,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  raised_by uuid default auth.uid(),
  title text not null,
  details text,
  cost numeric(10,2),
  status text not null default 'open' check (status in ('open','in_progress','done')),
  created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null default 'Other',
  description text not null,
  amount numeric(10,2) not null,
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);
create table public.bill_disputes (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  raised_by uuid default auth.uid(),
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  actor_id uuid default auth.uid(),
  action text not null,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.bills, public.payments, public.deposits, public.settlements, public.applications,
  public.invitations, public.maintenance_requests, public.expenses, public.bill_disputes, public.audit_logs, public.notifications to authenticated;
grant all on public.bills, public.payments, public.deposits, public.settlements, public.applications,
  public.invitations, public.maintenance_requests, public.expenses, public.bill_disputes, public.audit_logs, public.notifications to service_role;

alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.deposits enable row level security;
alter table public.settlements enable row level security;
alter table public.applications enable row level security;
alter table public.invitations enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.expenses enable row level security;
alter table public.bill_disputes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- Bills: whole household can read and add; owner can change/delete.
create policy "members read bills" on public.bills for select to authenticated using (public.is_member(property_id));
create policy "members add bills" on public.bills for insert to authenticated with check (public.is_member(property_id));
create policy "owner edits bills" on public.bills for update to authenticated using (public.is_owner(property_id));
create policy "owner deletes bills" on public.bills for delete to authenticated using (public.is_owner(property_id));

-- Payments: household ledger visible to members; former tenants keep their own.
create policy "read payments" on public.payments for select to authenticated using (public.is_member(property_id) or payer_id = auth.uid());
create policy "members record own payments" on public.payments for insert to authenticated with check (public.is_owner(property_id) or (public.is_active_tenant(property_id) and payer_id = auth.uid()));
create policy "owner updates payments" on public.payments for update to authenticated using (public.is_owner(property_id));

create policy "read deposits" on public.deposits for select to authenticated using (public.is_member(property_id) or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.tenant_id = auth.uid()));
create policy "owner writes deposits" on public.deposits for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

create policy "read settlements" on public.settlements for select to authenticated using (public.is_owner(property_id) or tenant_id = auth.uid());
create policy "owner writes settlements" on public.settlements for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

create policy "read applications" on public.applications for select to authenticated using (public.is_owner(property_id) or applicant_id = auth.uid());
create policy "owner updates applications" on public.applications for update to authenticated using (public.is_owner(property_id));

create policy "owner manages invitations" on public.invitations for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

create policy "members read maintenance" on public.maintenance_requests for select to authenticated using (public.is_member(property_id));
create policy "members raise maintenance" on public.maintenance_requests for insert to authenticated with check (public.is_member(property_id));
create policy "owner updates maintenance" on public.maintenance_requests for update to authenticated using (public.is_owner(property_id));

create policy "owner manages expenses" on public.expenses for all to authenticated using (public.is_owner(property_id)) with check (public.is_owner(property_id));

create policy "members read disputes" on public.bill_disputes for select to authenticated using (public.is_member(property_id));
create policy "members raise disputes" on public.bill_disputes for insert to authenticated with check (public.is_member(property_id) and raised_by = auth.uid());
create policy "owner updates disputes" on public.bill_disputes for update to authenticated using (public.is_owner(property_id));

create policy "members read audit" on public.audit_logs for select to authenticated using (public.is_member(property_id));
create policy "members write audit" on public.audit_logs for insert to authenticated with check (public.is_member(property_id) and actor_id = auth.uid());

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid());

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- Apply to a property with its invite code (applicant can't read the property directly).
create or replace function public.apply_with_code(_code text, _name text, _message text, _move_in date)
returns uuid language plpgsql security definer set search_path = public
as $$
declare _pid uuid; _id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into _pid from public.properties where invite_code = upper(trim(_code));
  if _pid is null then raise exception 'No property found for that code'; end if;
  insert into public.applications(property_id, applicant_id, applicant_name, applicant_email, message, move_in)
  values (_pid, auth.uid(), _name, (select email from auth.users where id = auth.uid()), _message, _move_in)
  returning id into _id;
  return _id;
end $$;
revoke all on function public.apply_with_code(text, text, text, date) from public, anon;
grant execute on function public.apply_with_code(text, text, text, date) to authenticated;
revoke all on function public.request_moveout(uuid, date) from public, anon;
grant execute on function public.request_moveout(uuid, date) to authenticated;