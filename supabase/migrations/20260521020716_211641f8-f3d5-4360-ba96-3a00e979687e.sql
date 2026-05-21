DROP VIEW IF EXISTS public.professionals CASCADE;
CREATE VIEW public.professionals
WITH (security_invoker = true)
AS SELECT
  id, tenant_id, name, type, role, is_active,
  schedule_start, schedule_end, schedule_days,
  metadata, created_at
FROM public.staff;

CREATE OR REPLACE FUNCTION public.professionals_iud()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.staff (id, tenant_id, name, type, role, is_active, schedule_start, schedule_end, schedule_days, metadata)
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.tenant_id, public.current_tenant_id()),
      NEW.name, NEW.type,
      COALESCE(NEW.role, 'professional'),
      COALESCE(NEW.is_active, true),
      NEW.schedule_start, NEW.schedule_end, NEW.schedule_days,
      COALESCE(NEW.metadata, '{}'::jsonb)
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.staff SET
      name = NEW.name, type = NEW.type, role = NEW.role,
      is_active = NEW.is_active,
      schedule_start = NEW.schedule_start, schedule_end = NEW.schedule_end,
      schedule_days = NEW.schedule_days,
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