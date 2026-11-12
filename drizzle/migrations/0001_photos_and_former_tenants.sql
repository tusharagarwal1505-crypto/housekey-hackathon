create policy "owners upload property photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-photos' and public.is_owner(((storage.foldername(name))[1])::uuid));
create policy "members view property photos" on storage.objects for select to authenticated
  using (bucket_id = 'property-photos' and public.is_member(((storage.foldername(name))[1])::uuid));

create or replace function public.was_tenant(_pid uuid) returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.tenancies where property_id = _pid and tenant_id = auth.uid()) $$;
create policy "former tenants read property" on public.properties for select to authenticated using (public.was_tenant(id));
create policy "former tenants read own room" on public.rooms for select to authenticated
  using (exists (select 1 from public.tenancies t where t.room_id = rooms.id and t.tenant_id = auth.uid()));
create policy "former tenants read own deposit" on public.deposits for select to authenticated
  using (exists (select 1 from public.tenancies t where t.id = deposits.tenancy_id and t.tenant_id = auth.uid()));