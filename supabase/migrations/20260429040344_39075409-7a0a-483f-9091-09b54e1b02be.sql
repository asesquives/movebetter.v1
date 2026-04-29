
-- 1) Horario fisios 07:00-13:00
UPDATE professionals
SET schedule_days = ARRAY['lun','mar','mie','jue','vie','sab'],
    schedule_start = '07:00',
    schedule_end = '13:00'
WHERE type = 'physio' AND is_active = true;

-- 2) Mover citas fuera de horario al rango 07:00-12:00 mismo día
DO $$
DECLARE
  r RECORD;
  new_start timestamptz;
  hour_offset int;
  base_date date;
BEGIN
  FOR r IN
    SELECT a.id, a.start_time, a.end_time,
           EXTRACT(EPOCH FROM (a.end_time - a.start_time))/60 AS dur_min
    FROM appointments a
    JOIN professionals p ON p.id = a.professional_id
    WHERE p.type = 'physio'
      AND (EXTRACT(HOUR FROM a.start_time AT TIME ZONE 'UTC') < 7
           OR EXTRACT(HOUR FROM a.start_time AT TIME ZONE 'UTC') >= 13)
  LOOP
    base_date := (r.start_time AT TIME ZONE 'UTC')::date;
    hour_offset := (abs(hashtext(r.id::text)) % 6);
    new_start := (base_date::timestamp + ((7 + hour_offset) || ' hours')::interval) AT TIME ZONE 'UTC';
    UPDATE appointments
    SET start_time = new_start,
        end_time = new_start + (r.dur_min || ' minutes')::interval
    WHERE id = r.id;
  END LOOP;
END $$;

-- 3) Generar citas adicionales hasta ~30 por fisio por mes
DO $$
DECLARE
  physio RECORD;
  month_start date;
  month_end date;
  current_count int;
  needed int;
  d date;
  slot int;
  cand_start timestamptz;
  cand_end timestamptz;
  conflict_count int;
  pkg RECORD;
  new_status appointment_status;
  appt_type appointment_type;
  attempts int;
  inserted_total int;
BEGIN
  FOR physio IN SELECT id FROM professionals WHERE type='physio' AND is_active=true LOOP
    FOR month_start IN
      SELECT generate_series('2025-12-01'::date, '2026-04-01'::date, '1 month')::date
    LOOP
      month_end := (month_start + interval '1 month')::date;

      SELECT COUNT(*) INTO current_count
      FROM appointments
      WHERE professional_id = physio.id
        AND start_time >= month_start AND start_time < month_end;

      needed := 30 - current_count;
      IF needed <= 0 THEN CONTINUE; END IF;

      inserted_total := 0;
      attempts := 0;
      WHILE inserted_total < needed AND attempts < needed * 20 LOOP
        attempts := attempts + 1;
        d := month_start + ((floor(random() * (month_end - month_start)))::int);
        IF EXTRACT(DOW FROM d) = 0 THEN CONTINUE; END IF;
        slot := (floor(random() * 6))::int;
        cand_start := (d::timestamp + ((7 + slot) || ' hours')::interval) AT TIME ZONE 'UTC';
        cand_end := cand_start + interval '1 hour';

        SELECT COUNT(*) INTO conflict_count
        FROM appointments
        WHERE professional_id = physio.id
          AND start_time < cand_end AND end_time > cand_start;
        IF conflict_count > 0 THEN CONTINUE; END IF;

        SELECT p.* INTO pkg
        FROM packages p
        WHERE p.status='active' AND p.total_sessions > 0
          AND p.type IN ('rehabilitation','prehabilitation','recovery')
        ORDER BY random() LIMIT 1;
        IF pkg.id IS NULL THEN EXIT; END IF;

        appt_type := pkg.type::text::appointment_type;

        IF cand_start < now() THEN
          new_status := CASE WHEN random() < 0.75 THEN 'done'::appointment_status ELSE 'scheduled'::appointment_status END;
        ELSE
          new_status := 'scheduled'::appointment_status;
        END IF;

        INSERT INTO appointments (professional_id, client_id, package_id, type, status, start_time, end_time, notes, revenue_amount)
        VALUES (physio.id, pkg.client_id, pkg.id, appt_type, new_status, cand_start, cand_end, 'seed-occupancy', 0);

        inserted_total := inserted_total + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 4) Revenue entries para nuevas citas done con package
DO $$
DECLARE
  a RECORD;
  pkg RECORD;
  amt numeric;
BEGIN
  FOR a IN
    SELECT ap.* FROM appointments ap
    LEFT JOIN revenue_entries re ON re.appointment_id = ap.id
    WHERE ap.notes = 'seed-occupancy'
      AND ap.status = 'done'
      AND ap.package_id IS NOT NULL
      AND re.id IS NULL
  LOOP
    SELECT * INTO pkg FROM packages WHERE id = a.package_id;
    IF pkg.id IS NULL OR pkg.total_sessions = 0 THEN CONTINUE; END IF;
    amt := pkg.total_paid::numeric / pkg.total_sessions::numeric;

    UPDATE appointments SET revenue_amount = amt WHERE id = a.id;
    INSERT INTO revenue_entries (appointment_id, client_id, package_id, amount, recognized_at)
    VALUES (a.id, a.client_id, a.package_id, amt, a.start_time);

    UPDATE packages
    SET sessions_used = sessions_used + 1,
        status = CASE WHEN sessions_used + 1 >= total_sessions THEN 'completed'::package_status ELSE status END
    WHERE id = pkg.id;
  END LOOP;
END $$;
