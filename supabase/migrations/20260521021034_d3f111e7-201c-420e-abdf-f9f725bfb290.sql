-- Enums (declared for typing only)
DO $$ BEGIN CREATE TYPE public.professional_type AS ENUM ('physio','evaluator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.package_type AS ENUM ('rehabilitation','prehabilitation','recovery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('yape','transfer','card','cash'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.receipt_type AS ENUM ('boleta','factura'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Make trigger-filled columns optional at type level
ALTER TABLE public.appointments  ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.appointments  ALTER COLUMN scheduled_at DROP NOT NULL;
ALTER TABLE public.clients       ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.clients       ALTER COLUMN full_name    DROP NOT NULL;
ALTER TABLE public.packages      ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.packages      ALTER COLUMN price_paid   DROP NOT NULL;
ALTER TABLE public.staff         ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.services      ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.payments      ALTER COLUMN tenant_id    DROP NOT NULL;
ALTER TABLE public.availability_blocks ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.availability_blocks ALTER COLUMN staff_id  DROP NOT NULL;