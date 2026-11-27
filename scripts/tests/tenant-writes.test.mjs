// database checks for suspended businesses and appointment balances.
// local stack only: supabase db reset && npm run test:db
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("test:db writes test data, so it only runs against a local Supabase stack.");
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, secret, options);
const owner = createClient(url, publishable, options);

// a business of its own, so suspending it cannot disturb the other tests
const mark = randomUUID().slice(0, 8);
const email = `writes-${mark}@example.test`;
const password = randomUUID();
let tenantId;
let userId;
let appointmentId;

async function must(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

const setStatus = (status) => must(service.from("tenants").update({ status }).eq("id", tenantId));
const balance = () => must(service.from("appointments").select("paid_cents, payment_status").eq("id", appointmentId).single());

before(async () => {
  const user = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(user.error, null);
  userId = user.data.user.id;
  tenantId = (await must(service.from("tenants").insert({ name: "Writes Test", slug: `writes-test-${mark}`, status: "active" }).select("id").single())).id;
  await must(service.from("profiles").upsert({ id: userId, email, full_name: "Writes Owner", role: "owner", tenant_id: tenantId }));
  await must(service.from("tenant_memberships").insert({ tenant_id: tenantId, profile_id: userId, role: "owner" }));
  const staffId = (await must(service.from("staff_members").insert({ tenant_id: tenantId, full_name: "Writes Staff" }).select("id").single())).id;
  const starts = new Date(Date.now() + 86400000);
  appointmentId = (
    await must(
      service
        .from("appointments")
        .insert({ tenant_id: tenantId, staff_id: staffId, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 3600000).toISOString(), total_cents: 1000 })
        .select("id")
        .single()
    )
  ).id;
  assert.equal((await owner.auth.signInWithPassword({ email, password })).error, null);
});

after(async () => {
  await service.from("tenants").update({ status: "active" }).eq("id", tenantId);
  await service.from("payments").delete().eq("tenant_id", tenantId);
  await service.from("tenants").delete().eq("id", tenantId);
  await service.auth.admin.deleteUser(userId);
});

test("balances follow the payment records and cannot be set by hand", async () => {
  const pay = (amount) => must(service.from("payments").insert({ tenant_id: tenantId, appointment_id: appointmentId, amount_cents: amount, status: "paid" }).select("id").single());
  const first = await pay(400);
  assert.deepEqual(await balance(), { paid_cents: 400, payment_status: "partial" });
  await pay(600);
  assert.deepEqual(await balance(), { paid_cents: 1000, payment_status: "paid" });
  await must(service.from("payments").update({ status: "voided" }).eq("id", first.id));
  assert.deepEqual(await balance(), { paid_cents: 600, payment_status: "partial" });

  for (const change of [{ paid_cents: 1000 }, { payment_status: "paid" }]) {
    assert.equal((await owner.from("appointments").update(change).eq("id", appointmentId)).error?.code, "42501");
  }
  // lowering the price to what was paid settles it
  await must(owner.from("appointments").update({ total_cents: 600 }).eq("id", appointmentId));
  assert.deepEqual(await balance(), { paid_cents: 600, payment_status: "paid" });
});

test("a suspended business cannot write, and can again once reactivated", async () => {
  const addService = () => owner.from("services").insert({ tenant_id: tenantId, name: "Cut", slug: `cut-${randomUUID().slice(0, 8)}`, duration_minutes: 30, price_cents: 100 });
  const edits = () => [
    addService(),
    owner.from("appointments").update({ notes: "x" }).eq("id", appointmentId),
    owner.from("tenants").update({ name: "Renamed" }).eq("id", tenantId),
    owner.storage.from("tenant-assets").upload(`${tenantId}/${randomUUID()}.png`, new Blob(["x"], { type: "image/png" })),
  ];

  await must(addService());
  await setStatus("suspended");
  for (const [index, result] of (await Promise.all(edits())).entries()) assert.ok(result.error, `write ${index} allowed while suspended`);
  // billing stays open
  const billing = await owner.from("tenant_billing_profiles").insert({ tenant_id: tenantId, billing_name: "Writes Test", billing_email: email });
  assert.equal(billing.error, null);
  // reading is still allowed
  assert.ok((await must(owner.from("services").select("id").eq("tenant_id", tenantId))).length);

  await setStatus("active");
  await must(addService());
});

test("every business table is either protected or deliberately exempt", async () => {
  const spec = await (await fetch(`${url}/rest/v1/`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` } })).json();
  const exempt = ["profiles", "account_applications", "subscriptions", "subscription_invoices", "subscription_payment_submissions", "tenant_billing_profiles"];
  const tables = Object.entries(spec.definitions)
    .filter(([name, definition]) => definition.properties.tenant_id && !exempt.includes(name))
    .map(([name]) => name);
  assert.ok(tables.length > 20);

  await setStatus("suspended");
  try {
    // the trigger runs before constraints, so even an incomplete row is turned away for the right reason.
    // tables clients cannot write at all are refused earlier, also with 42501
    for (const table of tables) {
      const { error } = await owner.from(table).insert({ tenant_id: tenantId });
      assert.equal(error?.code, "42501", `${table}: ${error?.code} ${error?.message}`);
    }
  } finally {
    await setStatus("active");
  }
});
