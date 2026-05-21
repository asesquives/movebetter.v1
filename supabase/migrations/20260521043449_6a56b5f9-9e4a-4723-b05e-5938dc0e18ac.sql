CREATE OR REPLACE FUNCTION public.check_appointment_done_future()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'done' AND NEW.start_time IS NOT NULL AND NEW.start_time::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'No se puede marcar una cita futura como realizada';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_check_appointment_done_future
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.check_appointment_done_future();