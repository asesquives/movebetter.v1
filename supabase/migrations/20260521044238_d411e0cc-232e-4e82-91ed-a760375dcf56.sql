-- Fix 1: Update search_path on SECURITY DEFINER helper functions
CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role = 'owner' FROM profiles WHERE id = auth.uid();
$function$;

-- Fix 2: Revoke anon execute on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM anon;

-- Fix 3: Prevent privilege escalation on profiles table
-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;

-- Recreate with granular policies
CREATE POLICY "Profiles are viewable by tenant users"
ON public.profiles
FOR SELECT
TO authenticated
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() AND tenant_id = current_tenant_id());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_owner())
WITH CHECK (is_owner());

-- Fix 4: Restrict payments INSERT to owners only
DROP POLICY IF EXISTS "payments_insert_staff" ON public.payments;
CREATE POLICY "payments_insert_owner"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND is_owner());

-- Fix 5: Change future done appointments to scheduled
UPDATE public.appointments
SET status = 'scheduled'
WHERE status = 'done'
  AND start_time::date > CURRENT_DATE;