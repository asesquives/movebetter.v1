
UPDATE public.professionals
SET schedule_days = ARRAY['lun','mar','mie','jue','vie','sab'],
    schedule_start = '07:00',
    schedule_end = '19:00'
WHERE type = 'physio' AND is_active = true;
