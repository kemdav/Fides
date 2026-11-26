// database checks for what the public key and signed-in users must never be able to do.
// local stack only: supabase db reset && npm run test:db
import assert from "node:assert/strict";
import { test } from "node:test";
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

async function signIn(email) {
  const client = createClient(url, publishable, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });
  assert.equal(error, null, `sign in ${email}`);
  return { client, id: data.user.id };
}

const SERVER_ONLY = ["account_applications", "application_identities", "application_businesses", "admin_activity_log", "subscription_plans"];

test("the public key cannot read or write server-only tables", async () => {
  const owner = await signIn("owner@bellavita.com");
  for (const client of [anon, owner.client]) {
    for (const table of SERVER_ONLY) {
      assert.ok((await client.from(table).select("*").limit(1)).error, `read ${table}`);
    }
    assert.ok((await client.from("admin_activity_log").insert({ business_name: "x", action: "x", category: "account" })).error);
    assert.ok((await client.from("account_applications").update({ status: "approved" }).eq("tenant_id", TENANT)).error);
  }
  // the server still can
  assert.equal((await service.from("account_applications").select("id").limit(1)).error, null);
});

test("users cannot change their own role or tenant, but can still edit their name", async () => {
  const { client, id } = await signIn("owner@bellavita.com");
  assert.ok((await client.from("profiles").update({ role: "admin" }).eq("id", id)).error);
  assert.ok((await client.from("profiles").update({ tenant_id: TENANT }).eq("id", id)).error);
  const { data } = await service.from("profiles").select("full_name").eq("id", id).single();
  assert.equal((await client.from("profiles").update({ full_name: data.full_name }).eq("id", id)).error, null);
});

test("staff cannot add themselves as an owner", async () => {
  const { data: staff } = await service.from("tenant_memberships").select("profile_id").eq("tenant_id", TENANT).eq("role", "staff").limit(1).single();
  const { data: user } = await service.auth.admin.getUserById(staff.profile_id);
  const { client, id } = await signIn(user.user.email);
  const insert = await client.from("tenant_memberships").insert({ tenant_id: TENANT, profile_id: id, role: "owner" });
  assert.ok(insert.error);
});

test("an owner cannot change their business status or give themselves a plan", async () => {
  const { client } = await signIn("owner@bellavita.com");
  assert.ok((await client.from("tenants").update({ status: "suspended" }).eq("id", TENANT)).error);
  assert.ok((await client.from("subscriptions").update({ status: "active" }).eq("tenant_id", TENANT)).error);
  assert.ok((await client.from("subscriptions").update({ current_period_end: "2099-01-01" }).eq("tenant_id", TENANT)).error);
  // the preferences the billing screen saves still work
  assert.equal((await client.from("subscriptions").update({ renewal_reminders_enabled: true }).eq("tenant_id", TENANT)).error, null);
});

test("server-only functions cannot be called by clients", async () => {
  const owner = await signIn("owner@bellavita.com");
  for (const client of [anon, owner.client]) {
    const call = await client.rpc("reserve_staff_email_change", { p_profile_id: owner.id });
    assert.equal(call.error?.code, "42501");
  }
});

test("signed-in users can still list their storage folders", async () => {
  const { client } = await signIn("owner@bellavita.com");
  for (const bucket of ["tenant-assets", "subscription-receipts", "application-documents"]) {
    assert.equal((await client.storage.from(bucket).list(TENANT)).error, null, bucket);
  }
});

test("applicants can look up only their own application id", async () => {
  const { client } = await signIn("owner@bellavita.com");
  const own = await client.from("account_applications").select("id, user_id");
  assert.equal(own.error, null);
  assert.ok(own.data.length <= 1);
  assert.ok((await client.from("account_applications").select("email")).error);
});
