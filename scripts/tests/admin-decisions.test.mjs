// database checks for admin decisions and payment writes.
// local stack only: supabase db reset && npm run test:db
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("test:db writes test data, so it only runs against a local Supabase stack.");
}

// local seed data, see supabase/seed.sql
const SEED_PASSWORD = "Password123!";
const TENANT = "11111111-1111-4111-8111-111111111111";

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, secret, options);
const anon = createClient(url, publishable, options);

const created = { users: [], tenants: [], applications: [] };

async function signIn(email) {
  const client = createClient(url, publishable, options);
  const { error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });
  assert.equal(error, null, `sign in ${email}`);
  return client;
}

const ADMIN = (await (await signIn("admin@fides.app")).auth.getUser()).data.user.id;

async function must(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

async function pendingApplication() {
  const mark = randomUUID().slice(0, 8);
  const email = `decision-${mark}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
  assert.equal(error, null);
  created.users.push(data.user.id);
  const application = await must(
    service
      .from("account_applications")
      .insert({
        reference_code: `FID-TEST-${mark}`,
        user_id: data.user.id,
        full_name: "Test Applicant",
        email,
        phone: "09170000000",
        plan_code: "business",
        terms_accepted_at: new Date().toISOString(),
        consent_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single()
  );
  created.applications.push(application.id);
  const business = `Decision Test ${mark}`;
  await must(
    service.from("application_businesses").insert({
      application_id: application.id,
      business_name: business,
      business_type: "Salon",
      established_year: 2020,
      street_address: "1 Test Street",
      city: "Cebu City",
      province: "Cebu",
      zip_code: "6000",
    })
  );
  return { id: application.id, userId: data.user.id, business, slug: `decision-test-${mark}` };
}

function approve(application, actorId = ADMIN, client = service) {
  return client.rpc("approve_application", {
    p_application_id: application.id,
    p_actor_id: actorId,
    p_actor_name: "Test Admin",
    p_slug_base: application.slug,
    p_trial_days: 30,
  });
}

const statusOf = async (id) => (await must(service.from("account_applications").select("status").eq("id", id).single())).status;

after(async () => {
  await service.from("admin_activity_log").delete().eq("actor", "Test Admin");
  await service.from("rejected_accounts").delete().eq("rejected_by", "Test Admin");
  await service.from("account_applications").delete().in("id", created.applications);
  await service.from("tenants").delete().in("id", created.tenants);
  for (const id of created.users) await service.auth.admin.deleteUser(id);
});

test("approval creates the account, an unpublished site and a trial subscription together", async () => {
  const application = await pendingApplication();
  const tenantId = await must(approve(application));
  created.tenants.push(tenantId);

  const tenant = await must(service.from("tenants").select("status, slug").eq("id", tenantId).single());
  assert.deepEqual(tenant, { status: "active", slug: application.slug });
  const settings = await must(service.from("tenant_settings").select("is_published").eq("tenant_id", tenantId).single());
  assert.equal(settings.is_published, false);
  const subscription = await must(service.from("subscriptions").select("status, trial_ends_at, subscription_tiers!subscriptions_tier_id_fkey(code)").eq("tenant_id", tenantId).single());
  assert.equal(subscription.status, "trialing");
  assert.equal(subscription.subscription_tiers.code, "business");
  assert.ok(new Date(subscription.trial_ends_at) > new Date(Date.now() + 29 * 86400000));
  const member = await must(service.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("profile_id", application.userId).single());
  assert.equal(member.role, "owner");
  assert.equal(await statusOf(application.id), "approved");

  assert.equal((await approve(application)).error?.message, "APPLICATION_NOT_PENDING");
});

test("a failure at the last step of approval leaves nothing behind", async () => {
  const application = await pendingApplication();
  // an actor that does not exist breaks the activity log insert, the final write
  assert.ok((await approve(application, randomUUID())).error);
  assert.equal(await statusOf(application.id), "pending");
  assert.deepEqual(await must(service.from("tenants").select("id").eq("slug", application.slug)), []);
  assert.deepEqual(await must(service.from("tenant_memberships").select("role").eq("profile_id", application.userId)), []);
});

test("rejection is recorded once and can be repeated to finish cleanup", async () => {
  const application = await pendingApplication();
  const reject = () =>
    service.rpc("reject_application", { p_application_id: application.id, p_actor_id: ADMIN, p_actor_name: "Test Admin", p_reason: "Documents could not be verified." });
  assert.equal(await must(reject()), true);
  assert.equal(await statusOf(application.id), "rejected");
  assert.equal(await must(reject()), false);
  const records = await must(service.from("rejected_accounts").select("business_name").eq("application_id", application.id));
  assert.deepEqual(records, [{ business_name: application.business }]);
  assert.equal((await approve(application)).error?.message, "APPLICATION_NOT_PENDING");
});

test("suspending changes the application and the business together, or nothing", async () => {
  const application = await pendingApplication();
  const tenantId = await must(approve(application));
  created.tenants.push(tenantId);
  const setAccess = (ids, suspend) =>
    service.rpc("set_account_access", { p_application_ids: ids, p_suspend: suspend, p_actor_id: ADMIN, p_actor_name: "Test Admin", p_reason: "Testing account access." });
  const tenantStatus = async () => (await must(service.from("tenants").select("status").eq("id", tenantId).single())).status;

  assert.equal((await setAccess([application.id, randomUUID()], true)).error?.message, "APPLICATION_NOT_FOUND");
  assert.equal(await tenantStatus(), "active");

  assert.equal(await must(setAccess([application.id], true)), 1);
  assert.equal(await tenantStatus(), "suspended");
  assert.equal(await statusOf(application.id), "suspended");
  assert.equal(await must(setAccess([application.id], true)), 0);
  assert.equal(await must(setAccess([application.id], false)), 1);
  assert.equal(await tenantStatus(), "active");
});

test("only the server can call the decision functions", async () => {
  const application = await pendingApplication();
  for (const client of [anon, await signIn("owner@bellavita.com")]) {
    assert.equal((await approve(application, ADMIN, client)).error?.code, "42501");
    assert.equal((await client.rpc("reject_application", { p_application_id: application.id, p_actor_id: ADMIN, p_actor_name: "x", p_reason: "x" })).error?.code, "42501");
    assert.equal((await client.rpc("set_account_access", { p_application_ids: [application.id], p_suspend: true, p_actor_id: ADMIN, p_actor_name: "x", p_reason: "x" })).error?.code, "42501");
  }
  assert.equal(await statusOf(application.id), "pending");
});

test("signed-in users can read payments but never write them", async () => {
  const owner = await signIn("owner@bellavita.com");
  const payment = await must(service.from("payments").insert({ tenant_id: TENANT, amount_cents: 100, status: "voided" }).select("id").single());
  try {
    assert.equal((await owner.from("payments").select("id").eq("id", payment.id)).data.length, 1);
    assert.equal((await owner.from("payments").insert({ tenant_id: TENANT, amount_cents: 100 })).error?.code, "42501");
    assert.equal((await owner.from("payments").update({ status: "paid" }).eq("id", payment.id)).error?.code, "42501");
    assert.equal((await owner.from("payments").delete().eq("id", payment.id)).error?.code, "42501");
  } finally {
    await service.from("payments").delete().eq("id", payment.id);
  }
});
