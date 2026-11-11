# Fides QA Demo & Testing Guide
**Feature / Epic**: CPG-93 Merchant Dashboard & Website Settings  
**Branch**: `CPG-93-man-das-website-settings`  
**Target Environment**: Local Development / QA  

---

## 1. Quickstart & Test Environment Setup

### 1.1 Prerequisites
Ensure Docker is running, then run the database reset to seed fresh test fixtures:
```bash
# 1. Reset database with migrations and QA fixtures
supabase db reset

# 2. Run typecheck and lint checks
npm run typecheck
npm run lint

# 3. Start Next.js development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### 1.2 Test User Accounts
All seeded accounts share the default password: **`Password123!`**

| Role | Email | Description / Permissions |
| :--- | :--- | :--- |
| **Tenant Owner** | `owner@bellavita.com` | **Full access**: Owner of Bella Vita Studio. Authorized to update website settings, manage appointments, and publish branding. |
| **Tenant Staff** | `staff@bellavita.com` | **Restricted access**: Staff member (Marco Reyes). Can view appointments, but **cannot** mutate website settings or publish branding. |
| **Platform Admin** | `admin@fides.app` | **Platform admin**: Global admin. Does not own Bella Vita Studio; **cannot** mutate tenant website settings without owner role. |

**Active Seed Tenant**:
- **Name**: `Bella Vita Studio`
- **Slug**: `bella-vita`
- **Tenant ID**: `11111111-1111-4111-8111-111111111111`
- **Subdomain URL**: `https://bella-vita.fides.app`

---

## 2. Test Suites & Verification Steps

---

### Test Suite 1: Dashboard Overview (`/dashboard`)

#### Scenario 1.1: KPI Metrics & Live Calculation
1. Log in as **`owner@bellavita.com`** (`Password123!`).
2. Navigate to **`/dashboard`**.
3. **Verify Metrics**:
   - **Today's Visits**: Displays count of today's appointments (default seeded: `4`).
   - **Confirmed**: Displays count of confirmed visits (default: `1`).
   - **Pending Approval**: Displays count of awaiting approvals (default: `1`).
   - **Checked In**: Displays visits currently in service / checked in (default: `1`).
   - **Completed Visits**: Displays completed visits (default: `1`).
   - **Revenue (Today)**: Dynamically calculated from completed visits and paid payments (₱1,500.00).

#### Scenario 1.2: Dynamic SVG Bar Chart
1. On the Overview page, observe the weekly visits bar chart.
2. **Verify**:
   - Bar heights scale dynamically according to real appointment counts.
   - Hovering over bars displays the tooltip with day label and visit count.

#### Scenario 1.3: Today's Appointments Table & Empty State (QA #1)
1. Scroll down to **Today's Appointments** on the Overview page.
2. **Verify**:
   - Seeded appointments appear with Customer Name, Service, Staff, Time, and Status badges.
3. **Empty State Check**:
   - If a tenant has zero appointments, a clean empty state card displays:
     - Icon: Calendar
     - Message: *"No appointments scheduled for today"*
     - Action button: *"Create New Booking"*

#### Scenario 1.4: Appointment Quick Actions & Status Updates (QA #3)
1. Locate an appointment in **Pending Approval** status (`Hannah Mendoza`).
2. Click the status action / dropdown and select **"Confirm Booking"**.
3. **Verify**:
   - A loading indicator displays briefly.
   - A success toast notification appears: *"Appointment marked as confirmed"*.
   - The status badge updates to **Confirmed** immediately.
   - Refresh the page: the status **persists** in PostgreSQL (`public.appointments.status = 'confirmed'`).
4. On any appointment, click the meatball menu (`...`) and click **"Cancel Booking"**.
5. In the confirmation dialog, confirm cancellation:
   - Success toast appears.
   - Status transitions to **Cancelled** and persists in the database.

#### Scenario 1.5: New Booking Modal (QA #4)
1. Click the **"+ New Booking"** button in the header.
2. In the modal dialog, fill in:
   - **Customer Name**: `Juan Dela Cruz`
   - **Service**: Select `Signature haircut`
   - **Staff**: Select `Marco Reyes`
   - **Time**: Select `02:00 PM`
3. Click **"Confirm Booking"**.
4. **Verify**:
   - Modal shows loading state while awaiting the server action.
   - Modal closes automatically on success.
   - Success toast appears: *"Appointment booked successfully"*.
   - Juan Dela Cruz appears in the Today's Appointments list.
   - Database check: Persisted across `customers`, `appointments`, and `appointment_services`.

---

### Test Suite 2: Appointments Management (`/dashboard/appointments`)

#### Scenario 2.1: List View vs Calendar View Toggle (QA #2)
1. Navigate to **`/dashboard/appointments`**.
2. Notice the view switcher tabs at top right: **"List"** and **"Calendar"**.
3. Click **"Calendar"**:
   - The interface switches seamlessly to the **Calendar Slot View**.
   - Time slots (9:00 AM, 11:00 AM, 2:00 PM, 4:00 PM, etc.) display cards matching today's appointments.
   - Each card displays customer name, service name, assigned staff, and status indicator.
4. Click **"List"**:
   - Returns to the table list view with sorting and filters intact.

#### Scenario 2.2: Calendar View Actions (QA #2 & QA #3)
1. Switch to **Calendar view**.
2. Click the action button on a card (e.g. Check In, Complete, or menu actions).
3. **Verify**:
   - Status updates in place with immediate visual feedback.
   - Persists upon page reload.

---

### Test Suite 3: Website Settings (`/dashboard/settings/website`)

#### Scenario 3.1: Branding & Visual Customization (QA #5 & QA #6)
1. Navigate to **`/dashboard/settings/website`**.
2. Under the **Branding** tab:
   - **Color Palette**: Inspect Main (`#FBF8F3`), Secondary (`#231F1A`), and Accent (`#C96E4B`).
   - **60/30/10 Rule Distribution Bar**: Observe the visual bar showing 60% main, 30% secondary, and 10% accent.
   - **Color Picker Modals (QA #6)**:
     - Click any color swatch edit button to open the Color Picker modal.
     - Try typing a custom hex code (e.g., `#EFE8D8`).
     - Try picking a preset swatch.
     - Test closing via: ESC key, backdrop click, Cancel button, and Apply button.
   - **Typography Preview (QA #5)**:
     - Toggle typography between presets (e.g., *Ovo + Mulish*, *Cormorant + Proza*, *Playfair + Inter*).
     - Notice the live mathematical scale preview (Headline, Section Title, Body, Caption).

#### Scenario 3.2: Media Upload Validation (QA #7)
1. In the **Logo** upload section:
   - Try uploading an invalid file (e.g. a `.pdf` or `.txt` file):
     - **Verify**: Client immediately blocks upload and displays toast: *"Only image files (PNG, JPEG, WebP, SVG) are allowed."*
   - Try uploading a file larger than **5 MB**:
     - **Verify**: Client displays error: *"Logo file size must not exceed 5MB."*
   - Upload a valid PNG/JPEG logo under 5 MB:
     - **Verify**: Uploads successfully and displays live in the preview.
2. In the **Cover Photo** section:
   - Try uploading a file larger than **10 MB**:
     - **Verify**: Client blocks and displays error: *"Cover photo size must not exceed 10MB."*
   - Upload a valid photo under 10 MB:
     - **Verify**: Uploads successfully into the preview.

#### Scenario 3.3: Tenant Storage Isolation (QA #8)
1. Inspect the uploaded image URL:
   - **Verify URL format**: `.../storage/v1/object/public/tenant-assets/11111111-1111-4111-8111-111111111111/logo/...`
   - Notice the `{tenant_id}` prefix enforcing strict folder-level tenant isolation.

#### Scenario 3.4: Draft Isolation (QA #9)
1. Edit the Headline text to: `A brand new experience at Bella Vita`.
2. Click **"Save draft"** button (or don't publish yet).
3. Success modal displays: *"Draft saved successfully"*.
4. Open a new incognito tab and query the public API:
   ```bash
   curl http://localhost:3000/api/tenant/website-settings?slug=bella-vita
   ```
5. **Verify (QA #14)**:
   - The returned JSON still contains the **published** headline (`A little time for yourself.`).
   - The draft changes are **NOT** visible on the public endpoint until published!

#### Scenario 3.5: Publishing Flow (QA #10)
1. Return to the Website Settings page.
2. Click **"Publish website"** at the top right.
3. The **Publish Review Modal** opens showing a summary of changes.
4. Click **"Confirm & Publish"**:
   - The button enters a loading state (`Publishing...`).
   - The server action `publishWebsiteSettingsAction` executes atomically.
   - Only after server confirmation does the **Publish Success Modal** display: *"Your website is live!"*.
5. Query the public API again:
   ```bash
   curl http://localhost:3000/api/tenant/website-settings?slug=bella-vita
   ```
6. **Verify**:
   - The headline now reflects the newly published text.
   - `published_at` timestamp is updated in PostgreSQL.

---

### Test Suite 4: Custom Domain & Address Management

#### Scenario 4.1: Subdomain Change (QA #11)
1. Go to the **Domain & SEO** tab (or Address section).
2. Click **"Change address"** next to the subdomain (`bella-vita.fides.app`).
3. Enter a reserved subdomain (e.g., `admin`, `api`, `app`, `login`):
   - **Verify**: Field displays error: *"This subdomain is reserved by the platform."*
4. Enter an invalid subdomain with special characters (e.g. `bella_vita!`):
   - **Verify**: Field displays error: *"Only lowercase letters, numbers, and hyphens are allowed."*
5. Enter a valid new subdomain (e.g., `bella-vita-studio`):
   - Click **"Update address"**.
   - Server action executes and updates `public.tenants.slug`.
   - Success modal appears confirming the new address.

#### Scenario 4.2: Custom Domain DNS Setup & Verification (QA #12)
1. In the Custom Domain section, click **"Add custom domain"** or **"Configure DNS"**.
2. **Verify Modal**:
   - Displays tenant-specific TXT verification token (e.g. `fides-verify=bv-7f9a2c4e8b1d`).
   - Displays correct platform A Record IP (`76.76.21.21`).
3. Click **"Check DNS status"**:
   - Button shows loading state with spinner: *"Checking DNS records..."*.
   - Action performs real DNS lookup with a 5-second timeout.
   - If records are not yet configured on the domain registrar, displays helpful guidance: *"DNS records not yet propagated. TXT record not found."*

---

### Test Suite 5: Security & Role-Based Access Control (QA #15)

#### Scenario 5.1: Owner Permitted
- Logged in as **`owner@bellavita.com`**:
  - Updating website settings: **Permitted (200 OK)**.
  - Uploading media: **Permitted (200 OK)**.
  - Publishing website: **Permitted (200 OK)**.

#### Scenario 5.2: Staff Restricted (RBAC Enforcement)
1. Log out and log in as **`staff@bellavita.com`** (`Password123!`).
2. Navigate to **`/dashboard/settings/website`**.
3. Attempt to save a draft or publish website settings:
   - **Verify**: Server action rejects mutation with:
     > *"Unauthorized: Only the tenant owner can update website settings."*
4. Database level verification: PostgreSQL RLS policies on `public.tenants` and `public.tenant_settings` require `role = 'owner'`.

---

## 3. QA Checklist & Verification Matrix

| QA Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **QA #1** | Zero appointments fallback state & dynamic metrics | Inspect `/dashboard` with 0 appointments; test dynamic counts | PASS |
| **QA #2** | List vs Calendar view toggle on Appointments | Switch to Calendar view on `/dashboard/appointments` | PASS |
| **QA #3** | Appointment status toggle & cancellation persistence | Change status / cancel row; reload page to verify DB save | PASS |
| **QA #4** | New Booking modal full persistence | Create booking; verify insert in `appointments` & `appointment_services` | PASS |
| **QA #5** | 60/30/10 Color distribution bar & typography math preview | Inspect Branding tab in Website Settings | PASS |
| **QA #6** | Color picker modal layouts & close handlers | Open picker modals; test Escape, backdrop click, preset pick | PASS |
| **QA #7** | Media upload MIME and size validation | Upload `.txt` and files >5MB/10MB; verify error feedback | PASS |
| **QA #8** | Tenant storage isolation | Inspect upload URL for `{tenant_id}/...` path prefix | PASS |
| **QA #9** | Draft isolation for logo & cover photo | Upload image without publishing; verify live endpoint unaffected | PASS |
| **QA #10** | Await server action before publish success modal | Publish changes; verify modal awaits server response | PASS |
| **QA #11** | Address change modal validation & persistence | Test reserved slugs; update subdomain and verify slug update | PASS |
| **QA #12** | Custom domain DNS verification token & platform IP | Inspect DNS modal token & IP; click Check DNS status | PASS |
| **QA #14** | Public endpoint returns live-only settings | `GET /api/tenant/website-settings?slug=bella-vita` | PASS |
| **QA #15** | Tenant Owner authorization enforcement (RBAC) | Test mutating settings as `staff@bellavita.com` | PASS |

---

## 4. Useful Database Verification Queries

Run via `supabase db reset` or PostgreSQL client (`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`):

```sql
-- Check Bella Vita tenant record and live brand colors
SELECT id, name, slug, brand_color, secondary_color, accent_color, logo_url 
FROM public.tenants 
WHERE slug = 'bella-vita';

-- Check tenant settings, draft state, and published timestamp
SELECT tenant_id, typography, headline, is_published, published_at, draft_settings 
FROM public.tenant_settings 
WHERE tenant_id = '11111111-1111-4111-8111-111111111111';

-- Check today's appointments and statuses
SELECT a.id, a.starts_at, a.status, c.full_name AS customer, s.full_name AS staff, a.total_cents
FROM public.appointments a
LEFT JOIN public.customers c ON c.id = a.customer_id
LEFT JOIN public.staff_members s ON s.id = a.staff_id
ORDER BY a.starts_at ASC;
```
