-- =========================================================
-- Back-compat shim migration for new multi-tenant schema
-- =========================================================

-- ---------- Helper: auto-fill tenant_id ----------
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- APPOINTMENTS ----------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz;

CREATE OR REPLACE FUNCTION public.appointments_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- professional_id <-> staff_id
  IF NEW.professional_id IS NOT NULL AND NEW.staff_id IS NULL THEN
    NEW.staff_id := NEW.professional_id;
  ELSIF NEW.staff_id IS NOT NULL AND NEW.professional_id IS NULL THEN
    NEW.professional_id := NEW.staff_id;
  END IF;

  -- start_time <-> scheduled_at
  IF NEW.start_time IS NOT NULL AND NEW.scheduled_at IS NULL THEN
    NEW.scheduled_at := NEW.start_time;
  ELSIF NEW.scheduled_at IS NOT NULL AND NEW.start_time IS NULL THEN
    NEW.start_time := NEW.scheduled_at;
  END IF;

  -- duration_minutes from end_time
  IF NEW.end_time IS NOT NULL AND NEW.scheduled_at IS NOT NULL THEN
    NEW.duration_minutes := GREATEST(1, CAST(EXTRACT(EPOCH FROM (NEW.end_time - NEW.scheduled_at)) / 60 AS integer));
  END IF;

  -- end_time from scheduled_at + duration
  IF NEW.end_time IS NULL AND NEW.scheduled_at IS NOT NULL AND NEW.duration_minutes IS NOT NULL THEN
    NEW.end_time := NEW.scheduled_at + make_interval(mins => NEW.duration_minutes);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_sync ON public.appointments;
CREATE TRIGGER trg_appointments_sync
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_sync();

DROP TRIGGER IF EXISTS trg_appointments_tenant ON public.appointments;
CREATE TRIGGER trg_appointments_tenant
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Backfill
UPDATE public.appointments
SET professional_id = COALESCE(professional_id, staff_id),
    start_time      = COALESCE(start_time, scheduled_at),
    end_time        = COALESCE(end_time, scheduled_at + make_interval(mins => COALESCE(duration_minutes, 60)));

-- ---------- CLIENTS ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS name text;

CREATE OR REPLACE FUNCTION public.clients_sync_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '') THEN
    NEW.full_name := NEW.name;
  ELSIF NEW.full_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_sync ON public.clients;
CREATE TRIGGER trg_clients_sync
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_sync_name();

DROP TRIGGER IF EXISTS trg_clients_tenant ON public.clients;
CREATE TRIGGER trg_clients_tenant
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

UPDATE public.clients SET name = full_name WHERE name IS NULL;

-- ---------- PACKAGES ----------
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS is_monthly_pass boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_per_session numeric,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS receipt_type text,
  ADD COLUMN IF NOT EXISTS total_paid numeric;

CREATE OR REPLACE FUNCTION public.packages_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.total_paid IS NOT NULL AND NEW.price_paid IS NULL THEN
    NEW.price_paid := NEW.total_paid;
  ELSIF NEW.price_paid IS NOT NULL AND NEW.total_paid IS NULL THEN
    NEW.total_paid := NEW.price_paid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_packages_sync ON public.packages;
CREATE TRIGGER trg_packages_sync
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.packages_sync();

DROP TRIGGER IF EXISTS trg_packages_tenant ON public.packages;
CREATE TRIGGER trg_packages_tenant
  BEFORE INSERT ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

UPDATE public.packages SET total_paid = price_paid WHERE total_paid IS NULL;

-- ---------- STAFF (add type) ----------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS type text;

DROP TRIGGER IF EXISTS trg_staff_tenant ON public.staff;
CREATE TRIGGER trg_staff_tenant
  BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ---------- PROFESSIONALS view (back-compat) ----------
DROP VIEW IF EXISTS public.professionals CASCADE;
CREATE VIEW public.professionals
WITH (security_invoker = true)
AS SELECT
  id, tenant_id, name, type, role, is_active,
  schedule_start, schedule_end, metadata, created_at
FROM public.staff;

CREATE OR REPLACE FUNCTION public.professionals_iud()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.staff (id, tenant_id, name, type, role, is_active, schedule_start, schedule_end, metadata)
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.tenant_id, public.current_tenant_id()),
      NEW.name, NEW.type,
      COALESCE(NEW.role, 'professional'),
      COALESCE(NEW.is_active, true),
      NEW.schedule_start, NEW.schedule_end,
      COALESCE(NEW.metadata, '{}'::jsonb)
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.staff SET
      name = NEW.name, type = NEW.type, role = NEW.role,
      is_active = NEW.is_active,
      schedule_start = NEW.schedule_start, schedule_end = NEW.schedule_end,
      metadata = NEW.metadata
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.staff WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_professionals_iud
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.professionals_iud();

-- ---------- SERVICES (add legacy cols) ----------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS program text,
  ADD COLUMN IF NOT EXISTS sessions integer,
  ADD COLUMN IF NOT EXISTS is_monthly_pass boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_per_session numeric;

DROP TRIGGER IF EXISTS trg_services_tenant ON public.services;
CREATE TRIGGER trg_services_tenant
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ---------- PACKAGE_CATALOG view ----------
DROP VIEW IF EXISTS public.package_catalog CASCADE;
CREATE VIEW public.package_catalog
WITH (security_invoker = true)
AS SELECT
  id, tenant_id, name, category, active, price, duration_minutes,
  program, sessions, is_monthly_pass, price_per_session, created_at
FROM public.services;

CREATE OR REPLACE FUNCTION public.package_catalog_iud()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.services (id, tenant_id, name, category, active, price, duration_minutes,
      program, sessions, is_monthly_pass, price_per_session)
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.tenant_id, public.current_tenant_id()),
      NEW.name, NEW.category, COALESCE(NEW.active, true),
      COALESCE(NEW.price, 0), COALESCE(NEW.duration_minutes, 60),
      NEW.program, NEW.sessions, COALESCE(NEW.is_monthly_pass, false), NEW.price_per_session
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.services SET
      name = NEW.name, category = NEW.category, active = NEW.active,
      price = NEW.price, duration_minutes = NEW.duration_minutes,
      program = NEW.program, sessions = NEW.sessions,
      is_monthly_pass = NEW.is_monthly_pass, price_per_session = NEW.price_per_session
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.services WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_package_catalog_iud
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.package_catalog
  FOR EACH ROW EXECUTE FUNCTION public.package_catalog_iud();

-- ---------- PAYMENTS tenant trigger + REVENUE_ENTRIES view ----------
DROP TRIGGER IF EXISTS trg_payments_tenant ON public.payments;
CREATE TRIGGER trg_payments_tenant
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP VIEW IF EXISTS public.revenue_entries CASCADE;
CREATE VIEW public.revenue_entries
WITH (security_invoker = true)
AS SELECT
  id, tenant_id, client_id, appointment_id, package_id,
  amount, currency, method AS payment_method, status,
  paid_at, notes, created_at
FROM public.payments;

CREATE OR REPLACE FUNCTION public.revenue_entries_iud()
RETURNS trigger LANGUAGE plpgsql AS $$
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
      COALESCE(NEW.paid_at, now()), NEW.notes
    )
    RETURNING id, tenant_id, client_id, appointment_id, package_id,
              amount, currency, method, status, paid_at, notes, created_at
    INTO NEW.id, NEW.tenant_id, NEW.client_id, NEW.appointment_id, NEW.package_id,
         NEW.amount, NEW.currency, NEW.payment_method, NEW.status,
         NEW.paid_at, NEW.notes, NEW.created_at;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_revenue_entries_ins
  INSTEAD OF INSERT ON public.revenue_entries
  FOR EACH ROW EXECUTE FUNCTION public.revenue_entries_iud();

-- ---------- AVAILABILITY_BLOCKS (new table) ----------
CREATE TABLE IF NOT EXISTS public.availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  professional_id uuid,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.availability_blocks_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.professional_id IS NOT NULL AND NEW.staff_id IS NULL THEN
    NEW.staff_id := NEW.professional_id;
  ELSIF NEW.staff_id IS NOT NULL AND NEW.professional_id IS NULL THEN
    NEW.professional_id := NEW.staff_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_avail_sync ON public.availability_blocks;
CREATE TRIGGER trg_avail_sync
  BEFORE INSERT OR UPDATE ON public.availability_blocks
  FOR EACH ROW EXECUTE FUNCTION public.availability_blocks_sync();

ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_blocks_tenant_isolation
  ON public.availability_blocks
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_avail_staff_date ON public.availability_blocks (staff_id, date);