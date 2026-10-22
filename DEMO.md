# CPG-61 & CPG-62 — Project Manager Testing & Demo Guide

**Branch:** `CPG-61-request_account`  
**Scope:** Strictly **CPG-61 (Request Account)** and **CPG-62 (Reset Account Request)**.  
**Note on Scope & UI:** To avoid merge conflicts with teammates working on **CPG-63 (Log In / Log Out)** and **CPG-64 (Authentication Error Handling)**, those modules and the existing baseline UI (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/*`) are untouched. Because the finalized Figma UI is not integrated yet, you can test **CPG-61** and **CPG-62** either directly via **API / `curl` commands** or via the **temporary headless verification routes** (`/request-account` and `/reset-request`).

---

## 1. Prerequisites & Running the Server

1. Start the development server on port `3000`:
   ```bash
   npm run dev
   ```
2. Keep your terminal visible to inspect **Nodemailer Console Transport** outputs (`[mail] console transport`) whenever an onboarding confirmation, activation link, or password reset token is dispatched.

---

## 2. Pre-Seeded Test Fixtures

The store (`src/lib/account-request/store.ts`) initializes with realistic multi-tenant clinical data so you can immediately test collisions, lookups, and resets:

### Existing Tenant Applications (`CPG-61` & `CPG-62`)
| Request ID | Reference Code | Subdomain (`slug`) | Status | Owner Email | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b19f3d21-6c40-4c9a-9f88-100000000001` | `REQ-2026-1042` | `apexdental` | `active` | `elena@apexdental.ph` | Test active subdomain collision & resending activation link |
| `b19f3d21-6c40-4c9a-9f88-100000000002` | `REQ-2026-1089` | `luminaortho` | `active` | `marco@luminaortho.ph` | Active orthodontic tenant fixture |
| `b19f3d21-6c40-4c9a-9f88-100000000003` | `REQ-2026-4821` | `brightsmiles` | `pending` | `camille@brightsmiles.ph` | Test pending subdomain collision & application lookup |
| `b19f3d21-6c40-4c9a-9f88-100000000004` | `REQ-2026-5104` | `veritasmedical` | `pending` | `julian@veritasmedical.ph` | Pending medical clinic fixture |
| `b19f3d21-6c40-4c9a-9f88-100000000005` | `REQ-2026-3910` | `metrocaredental` | `suspended` | `ramon@metrocaredental.ph` | Test **CPG-62** application revision & re-submission |

### Pre-Seeded User Accounts for `CPG-62` Password Reset Testing
| Account Scope (`scope`) | Email | Tenant Subdomain (`tenantSlug`) | Role |
| :--- | :--- | :--- | :--- |
| `client_owner` | `elena@apexdental.ph` | `apexdental` | Tenant Owner (`owner`) |
| `client_user` | `sofia.cruz@apexdental.ph` | `apexdental` | Receptionist (`receptionist`) |
| `client_user` | `dr.miguel@apexdental.ph` | `apexdental` | Dentist / Staff (`staff`) |
| `client_user` | `juan.delacruz@patient.ph` | `apexdental` | Patient (`patient`) |
| `fides_admin` | `admin@fides.app` | *(Platform Global)* | Fides Super Admin (`admin`) |

---

## 3. Testing CPG-61 (Request Account) via API (`curl`)

### Test 3.1: Real-Time Subdomain Availability & Validation (`GET /api/account-requests/validate-slug`)

1. **Check a Reserved System Subdomain (`admin`):**
   ```bash
   curl -s "http://localhost:3000/api/account-requests/validate-slug?slug=admin" | jq
   ```
2. **Check an Already-Claimed Subdomain (`apexdental`):**
   ```bash
   curl -s "http://localhost:3000/api/account-requests/validate-slug?slug=apexdental" | jq
   ```
3. **Check an Available Subdomain (`primecare`):**
   ```bash
   curl -s "http://localhost:3000/api/account-requests/validate-slug?slug=primecare" | jq
   ```

### Test 3.2: Submit a New Tenant Account Request (`POST /api/account-requests`)

```bash
curl -s -X POST http://localhost:3000/api/account-requests \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "PrimeCare Dental Studio",
    "category": "dental",
    "slug": "primecare",
    "ownerName": "Dr. Patricia Gomez",
    "ownerEmail": "patricia@primecare.ph",
    "phone": "+63 917 888 9900",
    "address": "Unit 802, Ayala Triangle Tower, Makati City",
    "estimatedStaff": "6-15",
    "licenseOrTaxId": "DOH-2026-DNT-7788",
    "notes": "Cosmetic and restorative dentistry with 6 chairs."
  }' | jq
```

---

## 4. Testing CPG-62 (Reset Account Request) via API (`curl`)

### Test 4.1: Request Password Reset Token (`action: "request_password_reset"`)

```bash
curl -s -X POST http://localhost:3000/api/account-requests/reset \
  -H "Content-Type: application/json" \
  -d '{
    "action": "request_password_reset",
    "scope": "client_user",
    "email": "sofia.cruz@apexdental.ph",
    "tenantSlug": "apexdental"
  }' | jq
```

### Test 4.2: Complete Password Reset (`action: "complete_password_reset"`)

Replace `PASTE_PWD_TOKEN_HERE` with the `resetToken` returned from Test 4.1:

```bash
curl -s -X POST http://localhost:3000/api/account-requests/reset \
  -H "Content-Type: application/json" \
  -d '{
    "action": "complete_password_reset",
    "email": "sofia.cruz@apexdental.ph",
    "resetToken": "PASTE_PWD_TOKEN_HERE",
    "newPassword": "NewSecurePassword2026!"
  }' | jq
```

### Test 4.3: Lookup Existing Onboarding Application (`action: "lookup_application"`)

```bash
curl -s -X POST http://localhost:3000/api/account-requests/reset \
  -H "Content-Type: application/json" \
  -d '{
    "action": "lookup_application",
    "identifier": "REQ-2026-3910"
  }' | jq
```

### Test 4.4: Reset & Revise a Suspended/Pending Application (`action: "reset_and_revise_application"`)

```bash
curl -s -X POST http://localhost:3000/api/account-requests/reset \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset_and_revise_application",
    "requestId": "b19f3d21-6c40-4c9a-9f88-100000000005",
    "businessName": "MetroCare Dental Group Inc.",
    "category": "dental",
    "slug": "metrocareplus",
    "ownerName": "Dr. Ramon Bautista",
    "ownerEmail": "ramon@metrocaredental.ph",
    "phone": "+63 920 441 9922",
    "address": "Emerald Ave, Ortigas Center, Pasig City",
    "estimatedStaff": "6-15",
    "notes": "Updated DOH registration and expanded to 6 dental chairs."
  }' | jq
```

### Test 4.5: Resend Tenant Activation Link (`action: "resend_activation"`)

```bash
curl -s -X POST http://localhost:3000/api/account-requests/reset \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resend_activation",
    "requestId": "b19f3d21-6c40-4c9a-9f88-100000000003"
  }' | jq
```

---

## 5. Testing via Temporary Headless Verification Pages (Browser)

- **CPG-61 (Request Account):** `http://localhost:3000/request-account`
- **CPG-62 (Reset Account Request):** `http://localhost:3000/reset-request`
