-- Drop pre-existing orphan function before applying full schema
DROP FUNCTION IF EXISTS public.handle_revenue_on_session_done() CASCADE;

-- ============================================================
-- Migration 1: Initial schema (professionals, clients, packages, appointments, revenue)
-- ============================================================
CREATE TYPE public.professional_type AS ENUM ('physio', 'evaluator');
CREATE TYPE public.package_type AS ENUM ('rehabilitation', 'prehabilitation', 'recovery');
CREATE TYPE public.payment_method AS ENUM ('yape', 'transfer', 'cash');
CREATE TYPE public.receipt_type AS ENUM ('boleta', 'factura');
CREATE TYPE public.package_status AS ENUM ('active', 'expired', 'completed');
CREATE TYPE public.appointment_type AS ENUM ('medical_diagnosis', 'physio_diagnosis', 'rehabilitation', 'prehabilitation', 'recovery');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'done', 'cancelled', 'no_show');

CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type professional_type NOT NULL DEFAULT 'physio',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read professionals" ON public.professionals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert professionals" ON public.professionals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update professionals" ON public.professionals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete professionals" ON public.professionals FOR DELETE TO authenticated USING (true);

CREATE TABLE public.availability_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read availability" ON public.availability_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert availability" ON public.availability_blocks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update availability" ON public.availability_blocks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete availability" ON public.availability_blocks FOR DELETE TO authenticated USING (true);

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type package_type NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 1,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_session NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  receipt_type receipt_type NOT NULL DEFAULT 'boleta',
  status package_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  is_monthly_pass BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read packages" ON public.packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update packages" ON public.packages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete packages" ON public.packages FOR DELETE TO authenticated USING (true);

CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type appointment_type NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  revenue_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete appointments" ON public.appointments FOR DELETE TO authenticated USING (true);

CREATE TABLE public.revenue_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  recognized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read revenue" ON public.revenue_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert revenue" ON public.revenue_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update revenue" ON public.revenue_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete revenue" ON public.revenue_entries FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Migration 2: package_catalog
-- ============================================================
CREATE TYPE public.catalog_program AS ENUM ('rehabilitation', 'prehabilitation', 'recovery', 'diagnosis');

CREATE TABLE public.package_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program public.catalog_program NOT NULL,
  name TEXT NOT NULL,
  sessions INTEGER,
  is_monthly_pass BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_session NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.package_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read package_catalog" ON public.package_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert package_catalog" ON public.package_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update package_catalog" ON public.package_catalog FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete package_catalog" ON public.package_catalog FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_package_catalog_updated_at
BEFORE UPDATE ON public.package_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.package_catalog (program, name, sessions, is_monthly_pass, price, price_per_session) VALUES
  ('diagnosis', 'Evaluación clínica', 1, false, 200, 200),
  ('diagnosis', 'Evaluación fisioterapéutica', 1, false, 150, 150),
  ('prehabilitation', 'Prehabilitation 10 sesiones', 10, false, 600, 60),
  ('prehabilitation', 'Prehabilitation Month Pass', NULL, true, 900, NULL),
  ('rehabilitation', 'Rehabilitación 5 sesiones', 5, false, 500, 100),
  ('rehabilitation', 'Rehabilitación 10 sesiones', 10, false, 800, 80),
  ('rehabilitation', 'Rehabilitación Month Pass', NULL, true, 1200, NULL),
  ('recovery', 'Recovery 1 sesión', 1, false, 70, 70),
  ('recovery', 'Recovery 2 sesiones', 2, false, 120, 60),
  ('recovery', 'Recovery 4 sesiones', 4, false, 200, 50);

-- ============================================================
-- Migration 3: professionals schedule columns
-- ============================================================
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS schedule_days text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS schedule_start time without time zone,
  ADD COLUMN IF NOT EXISTS schedule_end time without time zone;

-- ============================================================
-- Migration 4 & subsequent: revenue trigger (final version)
-- (Earlier intermediate versions are skipped — final wins)
-- ============================================================

-- ============================================================
-- Migration 5: remove Recovery 1 session from catalog
-- ============================================================
DELETE FROM public.package_catalog
WHERE program = 'recovery' AND sessions = 1 AND is_monthly_pass = false;

-- ============================================================
-- Migration 6: add 'card' payment method
-- ============================================================
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card';

-- ============================================================
-- Final revenue trigger (only packages devengan)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_revenue_on_session_done()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric := 0;
  v_pkg RECORD;
  v_existing_count integer;
BEGIN
  IF NEW.status <> 'done' THEN RETURN NEW; END IF;
  IF OLD.status = 'done' THEN RETURN NEW; END IF;

  IF NEW.package_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM public.revenue_entries WHERE appointment_id = NEW.id;
  IF v_existing_count > 0 THEN RETURN NEW; END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = NEW.package_id FOR UPDATE;
  IF v_pkg.id IS NULL OR v_pkg.total_sessions = 0 THEN RETURN NEW; END IF;

  v_amount := v_pkg.total_paid::numeric / v_pkg.total_sessions::numeric;

  UPDATE public.packages
  SET sessions_used = v_pkg.sessions_used + 1,
      status = CASE WHEN v_pkg.sessions_used + 1 >= v_pkg.total_sessions
               THEN 'completed'::package_status ELSE status END
  WHERE id = v_pkg.id;

  UPDATE public.appointments SET revenue_amount = v_amount WHERE id = NEW.id;

  IF v_amount > 0 THEN
    INSERT INTO public.revenue_entries (appointment_id, client_id, package_id, amount, recognized_at)
    VALUES (NEW.id, NEW.client_id, NEW.package_id, v_amount, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_revenue_on_session_done
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_revenue_on_session_done();