REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon, authenticated;