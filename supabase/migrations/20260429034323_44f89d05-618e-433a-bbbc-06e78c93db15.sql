
-- Temporary helper to execute raw seed SQL from an authorized edge function.
-- Drop after seeding.
CREATE OR REPLACE FUNCTION public.exec_seed_sql(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

-- Restrict execution to the service_role only
REVOKE ALL ON FUNCTION public.exec_seed_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_seed_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_seed_sql(text) TO service_role;
