-- ============================================================================
-- Fides — Local Development & QA Seed Data
-- ============================================================================

BEGIN;

-- 1. Seed Active Tenant
INSERT INTO public.tenants (id, name, slug, status, logo_url, brand_color, secondary_color, accent_color)
VALUES (
'11111111-1111-4111-8111-111111111111',
'Bella Vita Studio',
'bella-vita',
'active',
NULL,
'#FBF8F3',
'#231F1A',
'#C96E4B'
)
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
slug = EXCLUDED.slug,
status = 'active',
brand_color = EXCLUDED.brand_color,
secondary_color = EXCLUDED.secondary_color,
accent_color = EXCLUDED.accent_color;

-- 2. Seed Auth Users (Password for all accounts: Password123!)
INSERT INTO auth.users (
instance_id,
id,
aud,
role,
email,
encrypted_password,
email_confirmed_at,
raw_app_meta_data,
raw_user_meta_data,
created_at,
updated_at,
confirmation_token,
email_change,
email_change_token_new,
recovery_token
)
VALUES
(
'00000000-0000-0000-0000-000000000000',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'authenticated',
'authenticated',
'owner@bellavita.com',
extensions.crypt('Password123!', extensions.gen_salt('bf')),
NOW(),
'{"provider":"email","providers":["email"],"role":"owner","tenant_id":"11111111-1111-4111-8111-111111111111"}'::jsonb,
'{"full_name":"Maria Santos"}'::jsonb,
NOW(),
NOW(),
'',
'',
'',
''
),
(
'00000000-0000-0000-0000-000000000000',
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'authenticated',
'authenticated',
'staff@bellavita.com',
extensions.crypt('Password123!', extensions.gen_salt('bf')),
NOW(),
'{"provider":"email","providers":["email"],"role":"staff","tenant_id":"11111111-1111-4111-8111-111111111111"}'::jsonb,
'{"full_name":"Marco Reyes"}'::jsonb,
NOW(),
NOW(),
'',
'',
'',
''
),
(
'00000000-0000-0000-0000-000000000000',
'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'authenticated',
'authenticated',
'admin@fides.app',
extensions.crypt('Password123!', extensions.gen_salt('bf')),
NOW(),
'{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
'{"full_name":"Fides Admin"}'::jsonb,
NOW(),
NOW(),
'',
'',
'',
''
),
(
'00000000-0000-0000-0000-000000000000',
'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'authenticated',
'authenticated',
'reception@bellavita.example',
extensions.crypt('Password123!', extensions.gen_salt('bf')),
NOW(),
'{"provider":"email","providers":["email"],"role":"receptionist","tenant_id":"11111111-1111-4111-8111-111111111111"}'::jsonb,
'{"full_name":"Chloe Lim"}'::jsonb,
NOW(),
NOW(),
'',
'',
'',
''
),
(
'00000000-0000-0000-0000-000000000000',
'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
'authenticated',
'authenticated',
'sofia.lim@bellavita.example',
extensions.crypt('Password123!', extensions.gen_salt('bf')),
NOW(),
'{"provider":"email","providers":["email"],"role":"staff","tenant_id":"11111111-1111-4111-8111-111111111111"}'::jsonb,
'{"full_name":"Sofia Lim"}'::jsonb,
NOW(),
NOW(),
'',
'',
'',
''
)
ON CONFLICT (id) DO NOTHING;
-- 3. Seed Auth Identities (required by Supabase GoTrue email login)
INSERT INTO auth.identities (
id,
user_id,
provider_id,
identity_data,
provider,
last_sign_in_at,
created_at,
updated_at
)
VALUES
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"owner@bellavita.com","email_verified":true,"phone_verified":false}'::jsonb,
'email',
NOW(),
NOW(),
NOW()
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"staff@bellavita.com","email_verified":true,"phone_verified":false}'::jsonb,
'email',
NOW(),
NOW(),
NOW()
),
(
'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"admin@fides.app","email_verified":true,"phone_verified":false}'::jsonb,
'email',
NOW(),
NOW(),
NOW()
),
(
'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","email":"reception@bellavita.example","email_verified":true,"phone_verified":false}'::jsonb,
'email',
NOW(),
NOW(),
NOW()
),
(
'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
'{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","email":"sofia.lim@bellavita.example","email_verified":true,"phone_verified":false}'::jsonb,
'email',
NOW(),
NOW(),
NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Profiles & Tenant Memberships
INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner@bellavita.com', 'Maria Santos', 'owner', '11111111-1111-4111-8111-111111111111'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'staff@bellavita.com', 'Marco Reyes', 'staff', '11111111-1111-4111-8111-111111111111'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'admin@fides.app', 'Fides Admin', 'admin', NULL),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'reception@bellavita.example', 'Chloe Lim', 'receptionist', '11111111-1111-4111-8111-111111111111'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'sofia.lim@bellavita.example', 'Sofia Lim', 'staff', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (id) DO UPDATE SET
email = EXCLUDED.email,
full_name = EXCLUDED.full_name,
role = EXCLUDED.role,
tenant_id = EXCLUDED.tenant_id;

INSERT INTO public.tenant_memberships (tenant_id, profile_id, role)
VALUES
('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner'),
('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'staff'),
('11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'receptionist'),
('11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'staff')
ON CONFLICT (tenant_id, profile_id) DO UPDATE SET
role = EXCLUDED.role;

-- 5. Approved Account Application
INSERT INTO public.subscription_plans (code, name, price_php, staff_limit, is_active)
VALUES ('staff-qa', 'Staff QA', 1299, 10, FALSE)
ON CONFLICT (code) DO UPDATE SET staff_limit = EXCLUDED.staff_limit, is_active = EXCLUDED.is_active;

INSERT INTO public.account_applications (
id,
reference_code,
user_id,
full_name,
email,
phone,
status,
plan_code,
terms_accepted_at,
consent_accepted_at,
submitted_at,
reviewed_at,
reviewed_by,
approved_at,
decided_at,
tenant_id
)
VALUES (
'66666666-6666-4666-8666-666666666601',
'FID-1001',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'Maria Santos',
'owner@bellavita.com',
'+63 917 555 0143',
'approved',
'staff-qa',
NOW(),
NOW(),
NOW(),
NOW(),
'Local seed',
NOW(),
NOW(),
'11111111-1111-4111-8111-111111111111'
)
ON CONFLICT (user_id) DO UPDATE SET
status = 'approved',
plan_code = EXCLUDED.plan_code,
reviewed_at = NOW(),
approved_at = NOW(),
decided_at = NOW(),
tenant_id = '11111111-1111-4111-8111-111111111111';

-- 6. Tenant Settings
INSERT INTO public.tenant_settings (
tenant_id,
dominant_color,
secondary_color,
accent_color,
typography,
headline,
supporting_message,
business_category,
business_email,
phone_number,
instagram,
street_address,
city_province,
postal_code,
custom_domain_token,
is_published
)
VALUES (
'11111111-1111-4111-8111-111111111111',
'#FBF8F3',
'#231F1A',
'#C96E4B',
'Ovo + Mulish',
'A little time for yourself.',
'Thoughtful hair, skin, and nail care in a calm neighbourhood studio.',
'Beauty & wellness',
'hello@bellavita.ph',
'+63 917 555 0143',
'@bellavitastudio',
'142 Leviste Street, Salcedo Village',
'Makati, Metro Manila',
'1227',
'bv-7f9a2c4e8b1d',
TRUE
)
ON CONFLICT (tenant_id) DO NOTHING;

-- 6. Service Categories
INSERT INTO public.service_categories (id, tenant_id, name, slug, sort_order, active)
VALUES
('77777777-7777-4777-8777-777777777701', '11111111-1111-4111-8111-111111111111', 'Style & Care', 'style-and-care', 1, TRUE),
('77777777-7777-4777-8777-777777777702', '11111111-1111-4111-8111-111111111111', 'Rest & Recover', 'rest-and-recover', 2, TRUE),
('77777777-7777-4777-8777-777777777703', '11111111-1111-4111-8111-111111111111', 'Feel Your Best', 'feel-your-best', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Services (6 services across 3 categories)
INSERT INTO public.services (id, tenant_id, name, slug, description, duration_minutes, price_cents, category_id, active)
VALUES
(
  '22222222-2222-4222-8222-222222222201',
  '11111111-1111-4111-8111-111111111111',
  'Signature haircut',
  'signature-haircut',
  'A precision cut tailored to your face shape and style, finished with a relaxing scalp massage and blowout.',
  45, 65000,
  '77777777-7777-4777-8777-777777777701',
  TRUE
),
(
  '22222222-2222-4222-8222-222222222202',
  '11111111-1111-4111-8111-111111111111',
  'Balayage & gloss',
  'balayage-gloss',
  'Hand-painted highlights blended with a glossing treatment for natural, sun-kissed dimension.',
  120, 480000,
  '77777777-7777-4777-8777-777777777701',
  TRUE
),
(
  '22222222-2222-4222-8222-222222222203',
  '11111111-1111-4111-8111-111111111111',
  'Botanical spa manicure',
  'botanical-spa-manicure',
  'A nourishing hand and nail treatment with plant-based products, cuticle care, shaping, and polish.',
  60, 95000,
  '77777777-7777-4777-8777-777777777703',
  TRUE
),
(
  '22222222-2222-4222-8222-222222222204',
  '11111111-1111-4111-8111-111111111111',
  'Wellness massage',
  'wellness-massage',
  'A full-body relaxation massage using warm aromatic oils to ease tension and restore balance.',
  60, 120000,
  '77777777-7777-4777-8777-777777777702',
  TRUE
),
(
  '22222222-2222-4222-8222-222222222205',
  '11111111-1111-4111-8111-111111111111',
  'Hydra facial treatment',
  'hydra-facial-treatment',
  'A deep-cleansing facial with hydrating serums, gentle exfoliation, and LED light therapy.',
  50, 95000,
  '77777777-7777-4777-8777-777777777703',
  TRUE
),
(
  '22222222-2222-4222-8222-222222222206',
  '11111111-1111-4111-8111-111111111111',
  'Scalp detox & therapy',
  'scalp-detox-therapy',
  'A restorative scalp treatment with tea tree and peppermint to soothe, purify, and promote healthy hair growth.',
  30, 45000,
  '77777777-7777-4777-8777-777777777702',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price_cents = EXCLUDED.price_cents,
  category_id = EXCLUDED.category_id,
  active = EXCLUDED.active;

-- 7. Staff Members
INSERT INTO public.staff_members (id, tenant_id, full_name, title, bio, phone, active, profile_id, commission_type, commission_value, sort_order)
VALUES
('33333333-3333-4333-8333-333333333304', '11111111-1111-4111-8111-111111111111', 'Maria Santos', 'Business management', 'Manages the Bella Vita workspace.', '+63 917 555 0143', TRUE, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fixed', 0, 0),
('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111111', 'Marco Reyes', 'Senior Stylist', 'Specializes in precision cuts and balayage.', '+63 917 555 0144', TRUE, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'percentage', 20, 1),
('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111111', 'Elena Cruz', 'Color Specialist', 'Works across hair and skin services.', NULL, TRUE, NULL, 'fixed', 50, 2),
('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111111', 'Sofia Lim', 'Nail & Skin Therapist', 'Offers wellness treatments and nail care.', '+63 917 555 0145', TRUE, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'percentage', 15, 3),
('33333333-3333-4333-8333-333333333305', '11111111-1111-4111-8111-111111111111', 'Chloe Lim', 'Front Desk Coordinator', 'Handles bookings and customer check-ins.', '+63 917 555 0146', TRUE, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'fixed', 0, 4),
('33333333-3333-4333-8333-333333333306', '11111111-1111-4111-8111-111111111111', 'Jules Navarro', 'Former Stylist', NULL, NULL, FALSE, NULL, 'fixed', 125, 5),
('33333333-3333-4333-8333-333333333307', '11111111-1111-4111-8111-111111111111', 'Lia Ramos', 'Junior Therapist', NULL, NULL, TRUE, NULL, 'fixed', 0, 6)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  phone = EXCLUDED.phone,
  active = EXCLUDED.active,
  profile_id = EXCLUDED.profile_id,
  commission_type = EXCLUDED.commission_type,
  commission_value = EXCLUDED.commission_value,
  sort_order = EXCLUDED.sort_order;

-- 7b. Staff Service Skills
INSERT INTO public.staff_service_skills (tenant_id, staff_id, service_id)
VALUES
-- Marco Reyes: Signature haircut, Balayage & gloss
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222202'),
-- Elena Cruz: Signature haircut, Balayage & gloss, Botanical spa manicure, Hydra facial
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222203'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222205'),
-- Sofia Lim: Botanical spa manicure, Wellness massage, Scalp detox
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222204'),
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222206'),
-- Jules Navarro: An inactive staff member can retain service assignments.
('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222201')
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- 7c. Invitation states (display only)
INSERT INTO public.staff_invitations (id, tenant_id, full_name, email, role, title, created_at, expires_at, cancelled_at)
VALUES
('31313131-3131-4131-8131-313131313101', '11111111-1111-4111-8111-111111111111', 'Jade Rivera', 'jade.rivera@example.com', 'staff', 'Hair Stylist', now() - interval '1 day', now() + interval '6 days', NULL),
('31313131-3131-4131-8131-313131313102', '11111111-1111-4111-8111-111111111111', 'Nina Torres', 'nina.torres@example.com', 'receptionist', 'Front Desk Associate', now() - interval '10 days', now() - interval '3 days', NULL),
('31313131-3131-4131-8131-313131313103', '11111111-1111-4111-8111-111111111111', 'Emil Garcia', 'emil.garcia@example.com', 'staff', 'Massage Therapist', now() - interval '3 days', now() + interval '4 days', now() - interval '1 day')
ON CONFLICT (id) DO UPDATE SET
  created_at = EXCLUDED.created_at,
  expires_at = EXCLUDED.expires_at,
  cancelled_at = EXCLUDED.cancelled_at,
  accepted_at = NULL;

-- 7d. Real shifts, breaks and approved leave on the tenant's calendar
WITH schedule (id, staff_id, day_offset, start_time, end_time) AS (VALUES
  ('32323232-3232-4232-8232-323232323201'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, 0, time '09:00', time '17:00'),
  ('32323232-3232-4232-8232-323232323202'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 0, time '10:00', time '18:30'),
  ('32323232-3232-4232-8232-323232323203'::uuid, '33333333-3333-4333-8333-333333333303'::uuid, 0, time '10:00', time '16:00'),
  ('32323232-3232-4232-8232-323232323204'::uuid, '33333333-3333-4333-8333-333333333303'::uuid, 1, time '11:00', time '19:00'),
  ('32323232-3232-4232-8232-323232323205'::uuid, '33333333-3333-4333-8333-333333333305'::uuid, 0, time '08:30', time '16:30'),
  ('32323232-3232-4232-8232-323232323206'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, 2, time '12:00', time '20:00')
)
INSERT INTO public.shifts (id, tenant_id, staff_id, starts_at, ends_at)
SELECT id, '11111111-1111-4111-8111-111111111111', staff_id,
  (((now() at time zone 'Asia/Manila')::date + day_offset) + start_time) at time zone 'Asia/Manila',
  (((now() at time zone 'Asia/Manila')::date + day_offset) + end_time) at time zone 'Asia/Manila'
FROM schedule
ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;

INSERT INTO public.breaks (id, tenant_id, shift_id, starts_at, ends_at)
SELECT pause.id, shift.tenant_id, shift.id, shift.starts_at + interval '3 hours', shift.starts_at + interval '4 hours'
FROM (VALUES
  ('34343434-3434-4434-8434-343434343401'::uuid, '32323232-3232-4232-8232-323232323201'::uuid),
  ('34343434-3434-4434-8434-343434343402'::uuid, '32323232-3232-4232-8232-323232323204'::uuid)
) AS pause(id, shift_id)
JOIN public.shifts AS shift ON shift.id = pause.shift_id
ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at;

INSERT INTO public.leaves (id, tenant_id, staff_id, starts_on, ends_on, reason, approved)
VALUES ('35353535-3535-4535-8535-353535353501', '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333303', (now() at time zone 'Asia/Manila')::date,
  (now() at time zone 'Asia/Manila')::date, 'Planned leave', TRUE)
ON CONFLICT (id) DO UPDATE SET starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, approved = EXCLUDED.approved;

-- 8. Customers
INSERT INTO public.customers (id, tenant_id, full_name, email, phone)
VALUES
('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', 'Camille Rivera', 'camille@example.com', '+63 917 100 0001'),
('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', 'David Tan', 'david@example.com', '+63 917 100 0002'),
('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111111', 'Hannah Mendoza', 'hannah@example.com', '+63 917 100 0003'),
('44444444-4444-4444-8444-444444444404', '11111111-1111-4111-8111-111111111111', 'Isabel Villanueva', 'isabel@example.com', '+63 917 100 0004')
ON CONFLICT (id) DO NOTHING;

-- 9. Completed and upcoming appointments
INSERT INTO public.appointments (
id,
tenant_id,
customer_id,
staff_id,
source,
status,
starts_at,
ends_at,
total_cents,
created_by
)
VALUES
(
'55555555-5555-4555-8555-555555555501',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444401',
'33333333-3333-4333-8333-333333333301',
'online',
'completed',
least((((now() at time zone 'Asia/Manila')::date + time '09:00') at time zone 'Asia/Manila'), now() - interval '50 minutes'),
least((((now() at time zone 'Asia/Manila')::date + time '09:45') at time zone 'Asia/Manila'), now() - interval '5 minutes'),
150000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
),
(
'55555555-5555-4555-8555-555555555502',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444402',
'33333333-3333-4333-8333-333333333302',
'online',
'in_service',
((now() at time zone 'Asia/Manila')::date + time '11:00') at time zone 'Asia/Manila',
((now() at time zone 'Asia/Manila')::date + time '13:00') at time zone 'Asia/Manila',
480000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
),
(
'55555555-5555-4555-8555-555555555503',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444403',
'33333333-3333-4333-8333-333333333303',
'walk_in',
'confirmed',
(((now() at time zone 'Asia/Manila')::date + 1) + time '14:00') at time zone 'Asia/Manila',
(((now() at time zone 'Asia/Manila')::date + 1) + time '15:00') at time zone 'Asia/Manila',
95000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
),
(
'55555555-5555-4555-8555-555555555504',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444404',
'33333333-3333-4333-8333-333333333301',
'online',
'pending_approval',
(((now() at time zone 'Asia/Manila')::date + 2) + time '16:00') at time zone 'Asia/Manila',
(((now() at time zone 'Asia/Manila')::date + 2) + time '16:45') at time zone 'Asia/Manila',
150000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
),
(
'55555555-5555-4555-8555-555555555505',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444403',
'33333333-3333-4333-8333-333333333302',
'walk_in',
'completed',
now() - interval '3 hours',
now() - interval '2 hours 15 minutes',
150000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
),
-- extra confirmed appointment for check-in testing
(
'55555555-5555-4555-8555-555555555506',
'11111111-1111-4111-8111-111111111111',
'44444444-4444-4444-8444-444444444401',
'33333333-3333-4333-8333-333333333301',
'online',
'confirmed',
((now() at time zone 'Asia/Manila')::date + time '15:00') at time zone 'Asia/Manila',
((now() at time zone 'Asia/Manila')::date + time '15:45') at time zone 'Asia/Manila',
65000,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO UPDATE SET
  starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, status = EXCLUDED.status;

-- 10. Appointment Service Line Items
INSERT INTO public.appointment_services (
tenant_id,
appointment_id,
service_id,
staff_id,
price_cents,
duration_minutes
)
VALUES
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555501', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 150000, 45),
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555502', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333302', 480000, 120),
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555503', '22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333303', 95000, 60),
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555504', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 150000, 45),
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555505', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333302', 150000, 45),
('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555506', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 65000, 45)
ON CONFLICT (appointment_id, service_id) DO NOTHING;

COMMIT;
