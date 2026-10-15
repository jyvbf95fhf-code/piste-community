-- The platform-created DDL trigger helper is not an application RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
