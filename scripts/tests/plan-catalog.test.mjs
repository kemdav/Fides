// database checks for the single plan catalog. local stack only: supabase db reset && npm run test:db
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("test:db only runs against a local Supabase stack.");
}

const TENANT = "11111111-1111-4111-8111-111111111111";
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, secret, options);
const anon = createClient(url, publishable, options);

test("the catalog holds the three agreed plans", async () => {
  const { data, error } = await service.from("subscription_tiers").select("code, price_cents").in("code", ["basic", "business", "enterprise"]).order("price_cents");
  assert.equal(error, null);
  assert.deepEqual(data, [
    { code: "basic", price_cents: 49900 },
    { code: "business", price_cents: 149900 },
    { code: "enterprise", price_cents: 299900 },
  ]);
});

test("every application points at a tier", async () => {
  const [applications, tiers] = await Promise.all([
    service.from("account_applications").select("plan_code"),
    service.from("subscription_tiers").select("code"),
  ]);
  const codes = new Set(tiers.data.map((tier) => tier.code));
  for (const { plan_code } of applications.data) assert.ok(codes.has(plan_code), plan_code);
});

test("the staff seat limit comes from the business's tier, and only the server can ask", async () => {
  const { data, error } = await service.rpc("tenant_staff_seat_limit", { p_tenant_id: TENANT });
  assert.equal(error, null);
  assert.equal(data, 15);
  assert.equal((await anon.rpc("tenant_staff_seat_limit", { p_tenant_id: TENANT })).error?.code, "42501");
});
