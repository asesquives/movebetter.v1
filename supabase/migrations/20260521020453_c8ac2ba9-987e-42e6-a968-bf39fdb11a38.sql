-- Enums (used only for typing; columns remain text/flexible)
DO $$ BEGIN
  CREATE TYPE public.appointment_type AS ENUM ('medical_diagnosis','physio_diagnosis','rehabilitation','prehabilitation','recovery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','done','cancelled','no_show','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.catalog_program AS ENUM ('diagnosis','prehabilitation','rehabilitation','recovery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extra columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS schedule_days text[];
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS revenue_amount numeric;

-- Rebuild revenue_entries view to expose recognized_at
DROP VIEW IF EXISTS public.revenue_entries CASCADE;
CREATE VIEW public.revenue_entries
WITH (security_invoker = true)
AS SELECT
  id, tenant_id, client_id, appointment_id, package_id,
  amount, currency, method AS payment_method, status,
  paid_at, paid_at AS recognized_at,
  notes, created_at
FROM public.payments;

CREATE OR REPLACE FUNCTION public.revenue_entries_iud()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payments (id, tenant_id, client_id, appointment_id, package_id,
      amount, currency, method, status, paid_at, notes)
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.tenant_id, public.current_tenant_id()),
      NEW.client_id, NEW.appointment_id, NEW.package_id,
      NEW.amount, COALESCE(NEW.currency, 'PEN'),
      NEW.payment_method, COALESCE(NEW.status, 'paid'),
      COALESCE(NEW.paid_at, NEW.recognized_at, now()), NEW.notes
    )
    RETURNING id, tenant_id, client_id, appointment_id, package_id,
              amount, currency, method, status, paid_at, paid_at, notes, created_at
    INTO NEW.id, NEW.tenant_id, NEW.client_id, NEW.appointment_id, NEW.package_id,
         NEW.amount, NEW.currency, NEW.payment_method, NEW.status,
         NEW.paid_at, NEW.recognized_at, NEW.notes, NEW.created_at;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_revenue_entries_ins
  INSTEAD OF INSERT ON public.revenue_entries
  FOR EACH ROW EXECUTE FUNCTION public.revenue_entries_iud();