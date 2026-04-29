-- =====================================================
-- PASO 2: Clientes
-- =====================================================
INSERT INTO public.clients (id, name, phone, email) VALUES
  ('11111111-0000-0000-0000-000000000001', 'María Quispe Flores',     '+51 987 654 321', 'maria.quispe@gmail.com'),
  ('11111111-0000-0000-0000-000000000002', 'Carlos Mendoza Vega',     '+51 976 543 210', 'carlos.mendoza@gmail.com'),
  ('11111111-0000-0000-0000-000000000003', 'Lucía Torres Ramos',      '+51 965 432 109', 'lucia.torres@gmail.com'),
  ('11111111-0000-0000-0000-000000000004', 'Diego Huanca Pérez',      '+51 954 321 098', 'diego.huanca@gmail.com'),
  ('11111111-0000-0000-0000-000000000005', 'Valeria Soto Chávez',     '+51 943 210 987', 'valeria.soto@gmail.com'),
  ('11111111-0000-0000-0000-000000000006', 'Rodrigo Palomino Díaz',   '+51 932 109 876', 'rodrigo.palomino@gmail.com'),
  ('11111111-0000-0000-0000-000000000007', 'Camila Ríos Castillo',    '+51 921 098 765', 'camila.rios@gmail.com'),
  ('11111111-0000-0000-0000-000000000008', 'Sebastián Vargas Luna',   '+51 910 987 654, sebastian.vargas@gmail.com',  'sebastian.vargas@gmail.com'),
  ('11111111-0000-0000-0000-000000000009', 'Andrea Cárdenas Mora',    '+51 909 876 543', 'andrea.cardenas@gmail.com'),
  ('11111111-0000-0000-0000-000000000010', 'Felipe Espinoza Cruz',    '+51 998 765 432', 'felipe.espinoza@gmail.com');

-- Fix accidental concatenation for client 8
UPDATE public.clients
SET phone = '+51 910 987 654'
WHERE id = '11111111-0000-0000-0000-000000000008';

-- =====================================================
-- PASO 3: Paquetes
-- =====================================================
INSERT INTO public.packages
  (id, client_id, name, type, total_sessions, sessions_used, total_paid, price_per_session,
   payment_method, receipt_type, status, is_monthly_pass, expires_at, created_at)
VALUES
  ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',
    'Rehabilitación 10 sesiones','rehabilitation',10,0,800,80,
    'yape','boleta','active',false,
    '2026-07-01T00:00:00-05:00','2026-04-01T10:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002',
    'Rehabilitación 10 sesiones','rehabilitation',10,0,800,80,
    'transfer','boleta','active',false,
    '2026-07-03T00:00:00-05:00','2026-04-03T11:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000003',
    'Rehabilitación 5 sesiones','rehabilitation',5,0,500,100,
    'cash','boleta','active',false,
    '2026-07-05T00:00:00-05:00','2026-04-05T09:30:00-05:00'),
  ('22222222-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000004',
    'Rehabilitación 5 sesiones','rehabilitation',5,0,500,100,
    'yape','boleta','active',false,
    '2026-07-07T00:00:00-05:00','2026-04-07T15:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000005',
    'Prehabilitation 10 sesiones','prehabilitation',10,0,600,60,
    'transfer','boleta','active',false,
    '2026-07-08T00:00:00-05:00','2026-04-08T10:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000006',
    'Prehabilitation 10 sesiones','prehabilitation',10,0,600,60,
    'yape','boleta','active',false,
    '2026-07-10T00:00:00-05:00','2026-04-10T11:30:00-05:00'),
  ('22222222-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000007',
    'Recovery 4 sesiones','recovery',4,0,200,50,
    'cash','boleta','active',false,
    '2026-07-12T00:00:00-05:00','2026-04-12T09:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000008',
    'Recovery 4 sesiones','recovery',4,0,200,50,
    'yape','boleta','active',false,
    '2026-07-14T00:00:00-05:00','2026-04-14T16:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000009',
    'Rehabilitación Month Pass','rehabilitation',20,0,1200,60,
    'transfer','boleta','active',true,
    '2026-04-30T23:59:59-05:00','2026-04-01T08:00:00-05:00'),
  ('22222222-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000010',
    'Rehabilitación 10 sesiones','rehabilitation',10,0,800,80,
    'cash','boleta','active',false,
    '2026-07-15T00:00:00-05:00','2026-04-15T10:30:00-05:00');

-- =====================================================
-- PASO 4: Disponibilidad (Giacomo y Eddy)
-- =====================================================
-- Giacomo Lavaggi
INSERT INTO public.availability_blocks (professional_id, date, start_time, end_time, is_available) VALUES
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-08','09:00','13:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-10','08:00','12:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-14','08:00','12:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-16','10:00','14:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-23','09:00','13:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-25','08:00','12:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-04-28','09:00','12:00',true),
  ('64a34061-83bc-45a4-9179-61265d9b6885','2026-05-01','08:00','11:00',true);

-- Eddy Rojas
INSERT INTO public.availability_blocks (professional_id, date, start_time, end_time, is_available) VALUES
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-07','10:00','14:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-09','09:00','13:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-11','08:00','11:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-15','09:00','13:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-17','10:00','13:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-21','08:00','12:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-22','10:00','14:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-24','09:00','12:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-04-29','10:00','14:00',true),
  ('f8a655c3-ecbd-4769-8cae-6481b0da8ed8','2026-05-02','09:00','13:00',true);

-- =====================================================
-- PASO 5: Citas de fisioterapeutas vinculadas a paquetes
-- Fisio 1: 9d23524e-5e84-4e75-bbd7-2c3084e9d183
-- Fisio 2: 3943308a-9e36-4715-bdfc-3c9e52581cc4
-- Fisio 3: aa80cfe1-5273-48d9-88a5-914c47e84713
-- =====================================================

-- María Quispe (rehab 10) — 5 citas: 4 done, 1 scheduled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000001','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000001','rehabilitation','done',     '2026-04-02T09:00:00-05:00','2026-04-02T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000001','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000001','rehabilitation','done',     '2026-04-04T10:00:00-05:00','2026-04-04T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000001','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000001','rehabilitation','done',     '2026-04-09T11:00:00-05:00','2026-04-09T12:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000001','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000001','rehabilitation','done',     '2026-04-16T09:00:00-05:00','2026-04-16T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000001','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000001','rehabilitation','scheduled','2026-04-30T10:00:00-05:00','2026-04-30T11:00:00-05:00');

-- Carlos Mendoza (rehab 10) — 5 citas: 3 done, 1 cancelled, 1 scheduled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000002','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000002','rehabilitation','done',     '2026-04-04T08:00:00-05:00','2026-04-04T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000002','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000002','rehabilitation','done',     '2026-04-08T15:00:00-05:00','2026-04-08T16:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000002','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000002','rehabilitation','done',     '2026-04-15T16:00:00-05:00','2026-04-15T17:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000002','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000002','rehabilitation','cancelled','2026-04-22T17:00:00-05:00','2026-04-22T18:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000002','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000002','rehabilitation','scheduled','2026-04-29T08:00:00-05:00','2026-04-29T09:00:00-05:00');

-- Lucía Torres (rehab 5) — 4 citas: 3 done, 1 no_show
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000003','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000003','rehabilitation','done',   '2026-04-06T07:00:00-05:00','2026-04-06T08:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000003','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000003','rehabilitation','done',   '2026-04-10T13:00:00-05:00','2026-04-10T14:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000003','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000003','rehabilitation','done',   '2026-04-17T08:00:00-05:00','2026-04-17T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000003','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000003','rehabilitation','no_show','2026-04-24T12:00:00-05:00','2026-04-24T13:00:00-05:00');

-- Diego Huanca (rehab 5) — 3 citas done
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000004','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000004','rehabilitation','done','2026-04-08T10:00:00-05:00','2026-04-08T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000004','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000004','rehabilitation','done','2026-04-14T14:00:00-05:00','2026-04-14T15:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000004','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000004','rehabilitation','done','2026-04-21T11:00:00-05:00','2026-04-21T12:00:00-05:00');

-- Valeria Soto (prehab 10) — 5 citas: 4 done, 1 scheduled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000005','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000005','prehabilitation','done',     '2026-04-09T07:00:00-05:00','2026-04-09T08:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000005','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000005','prehabilitation','done',     '2026-04-11T08:00:00-05:00','2026-04-11T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000005','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000005','prehabilitation','done',     '2026-04-16T17:00:00-05:00','2026-04-16T18:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000005','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000005','prehabilitation','done',     '2026-04-23T09:00:00-05:00','2026-04-23T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000005','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000005','prehabilitation','scheduled','2026-05-02T09:00:00-05:00','2026-05-02T10:00:00-05:00');

-- Rodrigo Palomino (prehab 10) — 4 citas done
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000006','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000006','prehabilitation','done','2026-04-11T10:00:00-05:00','2026-04-11T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000006','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000006','prehabilitation','done','2026-04-15T13:00:00-05:00','2026-04-15T14:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000006','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000006','prehabilitation','done','2026-04-18T16:00:00-05:00','2026-04-18T17:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000006','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000006','prehabilitation','done','2026-04-25T11:00:00-05:00','2026-04-25T12:00:00-05:00');

-- Camila Ríos (recovery 4) — 3 citas done
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000007','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000007','recovery','done','2026-04-13T08:00:00-05:00','2026-04-13T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000007','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000007','recovery','done','2026-04-17T15:00:00-05:00','2026-04-17T16:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000007','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000007','recovery','done','2026-04-22T09:00:00-05:00','2026-04-22T10:00:00-05:00');

-- Sebastián Vargas (recovery 4) — 3 citas: 2 done, 1 scheduled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000008','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000008','recovery','done',     '2026-04-15T17:00:00-05:00','2026-04-15T18:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000008','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000008','recovery','done',     '2026-04-20T10:00:00-05:00','2026-04-20T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000008','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000008','recovery','scheduled','2026-04-28T16:00:00-05:00','2026-04-28T17:00:00-05:00');

-- Andrea Cárdenas (Month Pass 20) — 6 citas: 5 done, 1 scheduled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000009','rehabilitation','done',     '2026-04-02T07:00:00-05:00','2026-04-02T08:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000009','rehabilitation','done',     '2026-04-06T09:00:00-05:00','2026-04-06T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000009','rehabilitation','done',     '2026-04-13T16:00:00-05:00','2026-04-13T17:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000009','rehabilitation','done',     '2026-04-18T08:00:00-05:00','2026-04-18T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000009','rehabilitation','done',     '2026-04-23T11:00:00-05:00','2026-04-23T12:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000009','rehabilitation','scheduled','2026-04-29T15:00:00-05:00','2026-04-29T16:00:00-05:00');

-- Felipe Espinoza (rehab 10) — 5 citas: 4 done, 1 cancelled
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000010','rehabilitation','done',     '2026-04-16T07:00:00-05:00','2026-04-16T08:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000010','rehabilitation','done',     '2026-04-18T11:00:00-05:00','2026-04-18T12:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010','3943308a-9e36-4715-bdfc-3c9e52581cc4','22222222-0000-0000-0000-000000000010','rehabilitation','done',     '2026-04-22T14:00:00-05:00','2026-04-22T15:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010','aa80cfe1-5273-48d9-88a5-914c47e84713','22222222-0000-0000-0000-000000000010','rehabilitation','done',     '2026-04-25T09:00:00-05:00','2026-04-25T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010','9d23524e-5e84-4e75-bbd7-2c3084e9d183','22222222-0000-0000-0000-000000000010','rehabilitation','cancelled','2026-04-27T16:00:00-05:00','2026-04-27T17:00:00-05:00');

-- =====================================================
-- PASO 5b: Sincronizar packages.sessions_used con citas done
-- =====================================================
UPDATE public.packages p
SET sessions_used = sub.cnt,
    status = CASE WHEN sub.cnt >= p.total_sessions THEN 'completed'::package_status ELSE p.status END
FROM (
  SELECT package_id, COUNT(*)::int AS cnt
  FROM public.appointments
  WHERE status = 'done' AND package_id IS NOT NULL
  GROUP BY package_id
) sub
WHERE p.id = sub.package_id;

-- =====================================================
-- PASO 6: Citas de evaluadores (diagnósticos)
-- Felipe y Andrea ya tienen paquete; los demás son sesiones sueltas.
-- Eddy:    f8a655c3-ecbd-4769-8cae-6481b0da8ed8
-- Giacomo: 64a34061-83bc-45a4-9179-61265d9b6885
-- =====================================================

-- Diagnósticos para clientes con paquete (sin package_id, son evaluación inicial suelta)
INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000010', '64a34061-83bc-45a4-9179-61265d9b6885', NULL,'medical_diagnosis','done',     '2026-04-14T08:00:00-05:00','2026-04-14T09:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000009', 'f8a655c3-ecbd-4769-8cae-6481b0da8ed8', NULL,'physio_diagnosis','done',     '2026-04-09T09:00:00-05:00','2026-04-09T10:00:00-05:00');

-- Clientes nuevos sin paquete activo (sesiones sueltas de diagnóstico)
INSERT INTO public.clients (id, name, phone, email) VALUES
  ('11111111-0000-0000-0000-000000000011','Patricia Salazar Núñez','+51 987 111 222','patricia.salazar@gmail.com'),
  ('11111111-0000-0000-0000-000000000012','Jorge Aliaga Bermúdez','+51 987 222 333','jorge.aliaga@gmail.com'),
  ('11111111-0000-0000-0000-000000000013','Renata Bustamante Olivera','+51 987 333 444','renata.bustamante@gmail.com');

INSERT INTO public.appointments (id, client_id, professional_id, package_id, type, status, start_time, end_time) VALUES
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000011','64a34061-83bc-45a4-9179-61265d9b6885',NULL,'medical_diagnosis','done',     '2026-04-08T10:00:00-05:00','2026-04-08T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000012','f8a655c3-ecbd-4769-8cae-6481b0da8ed8',NULL,'physio_diagnosis','done',      '2026-04-11T09:00:00-05:00','2026-04-11T10:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000013','64a34061-83bc-45a4-9179-61265d9b6885',NULL,'medical_diagnosis','scheduled','2026-04-28T10:00:00-05:00','2026-04-28T11:00:00-05:00'),
  (gen_random_uuid(),'11111111-0000-0000-0000-000000000011','f8a655c3-ecbd-4769-8cae-6481b0da8ed8',NULL,'physio_diagnosis','scheduled', '2026-04-29T11:00:00-05:00','2026-04-29T12:00:00-05:00');

-- =====================================================
-- PASO 7: revenue_entries para todas las citas con status='done'
-- =====================================================
-- Citas con paquete: monto = total_paid / total_sessions
INSERT INTO public.revenue_entries (appointment_id, client_id, package_id, amount, recognized_at)
SELECT a.id, a.client_id, a.package_id,
       ROUND(p.total_paid::numeric / NULLIF(p.total_sessions,0)::numeric, 2),
       a.start_time
FROM public.appointments a
JOIN public.packages p ON p.id = a.package_id
WHERE a.status = 'done' AND a.package_id IS NOT NULL;

-- Citas sin paquete (diagnósticos sueltos)
INSERT INTO public.revenue_entries (appointment_id, client_id, package_id, amount, recognized_at)
SELECT a.id, a.client_id, NULL,
       CASE WHEN a.type = 'medical_diagnosis' THEN 200
            WHEN a.type = 'physio_diagnosis'  THEN 150
            ELSE 0 END,
       a.start_time
FROM public.appointments a
WHERE a.status = 'done' AND a.package_id IS NULL;

-- Reflejar revenue_amount en appointments (igual que el trigger)
UPDATE public.appointments a
SET revenue_amount = re.amount
FROM public.revenue_entries re
WHERE re.appointment_id = a.id;