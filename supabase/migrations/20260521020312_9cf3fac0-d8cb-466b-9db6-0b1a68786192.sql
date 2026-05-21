ALTER FUNCTION public.set_tenant_id() SECURITY INVOKER SET search_path = public;
ALTER FUNCTION public.appointments_sync() SET search_path = public;
ALTER FUNCTION public.clients_sync_name() SET search_path = public;
ALTER FUNCTION public.packages_sync() SET search_path = public;
ALTER FUNCTION public.professionals_iud() SET search_path = public;
ALTER FUNCTION public.package_catalog_iud() SET search_path = public;
ALTER FUNCTION public.revenue_entries_iud() SET search_path = public;
ALTER FUNCTION public.availability_blocks_sync() SET search_path = public;