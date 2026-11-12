revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.is_active_tenant(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.was_tenant(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role), public.is_owner(uuid), public.is_active_tenant(uuid), public.is_member(uuid), public.was_tenant(uuid) to authenticated;