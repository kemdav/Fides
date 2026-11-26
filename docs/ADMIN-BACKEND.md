# Admin backend plan

Tracks the work to make the Fides admin portal real and production ready. Tick items in the same change that finishes them.

## Decisions (agreed)

1. Admins are **Supabase Auth** accounts listed in `platform_admins`. `/admin/login` stays separate from `/login`.
2. One plan catalog: **Basic ₱499, Business ₱1,499, Enterprise ₱2,999** per month.
3. Approval does **not** publish the website. The owner publishes after approval (SRS 3.1.2).
4. Billing is **manual bank transfer** verified by an admin, with automated invoices and reminders. No payment gateway.

## Steps

### 0. Foundations
- [x] Close client-side access holes found while doing the admin move (see SECURITY, KNOWN-ISSUES S8). **Not yet applied to the hosted database.**
- [x] Admin identity on Supabase Auth, signed-in name shown, decisions record which admin made them, log out button
- [x] One admin guard, zod input checks and one result shape for every admin action (`lib/admin/action.ts`, `features/admin/`, `app/actions/admin.ts`). No screen calls the actions yet.
- [ ] Merge `subscription_plans` into `subscription_tiers`
- [ ] Approve, reject and suspend as single database transactions

### 1. Verification
- [ ] Real review queue: search, sort, waiting time, overdue flags
- [ ] Document viewer using short-lived private links
- [ ] Approve: tenant (not published), owner, settings, subscription, email
- [ ] Reject with reason, resend email, earlier rejections
- [ ] "Request changes" and resubmission (needs a new application status)

### 2. Tenants
- [ ] Real list with filters and pagination
- [ ] Tenant detail page: owner, plan, usage, invoices, history
- [ ] Suspend and reactivate (single and bulk), enforced by the tenant access guard on every request
- [ ] Change a tenant's plan

### 3. Subscription tiers
- [ ] Create, edit and archive tiers and their features
- [ ] Enforce tier limits and features on the merchant side

### 4. Billing and payments
- [ ] Payment proof review queue: view receipt, verify or reject, mark invoice paid
- [ ] Generate renewal invoices and mark overdue ones
- [ ] Apply scheduled plan changes, cancellations and trial expiry

### 5. Scheduled jobs and notifications
- [ ] Scheduler for due-date reminders and the billing jobs
- [ ] Admin notification bell: new application, new payment proof, overdue account
- [ ] Merchant emails for every decision, with retry on failure

### 6. Overview and activity log
- [ ] Real metrics, charts, queue and follow-ups
- [ ] Real activity log with filters, details and CSV export, including billing and sign-ins

### 7. Account and support
- [ ] Admin profile, password change, password reset and MFA
- [ ] Support inbox for contact form messages
- [ ] Global search
- [ ] Optional, only if wanted: reports, platform settings, access and roles (in the Figma sidebar)

### 8. Production readiness
Done inside each step and checked again at the end: tests for services and tenant isolation, rate limits,
structured logs without personal data, environment checks, loading, empty and error states, docs.
