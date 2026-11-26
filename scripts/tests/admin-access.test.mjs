// database checks for platform admin access. run against the local stack only:
//   supabase db reset && npm run test:db
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("test:db creates and deletes accounts, so it only runs against a local Supabase stack.");
}

// local seed accounts, see supabase/seed.sql
const SEED_PASSWORD = "Password123!";
const SEED_ADMIN = "admin@fides.app";
const SEED_OWNER = "owner@bellavita.com";

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, secret, options);
const anon = createClient(url, publishable, options);
const created = [];

async function signIn(email, password = SEED_PASSWORD) {
  const client = createClient(url, publishable, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `sign in ${email}`);
  return { client, id: data.user.id };
}

const isAdmin = async (client) => (await client.rpc("is_platform_admin")).data;

const script = (...args) => execFileSync(process.execPath, ["scripts/create-admin.mjs", ...args], { encoding: "utf8", stdio: "pipe" });

after(async () => {
  for (const id of created) await service.auth.admin.deleteUser(id);
});

test("anonymous callers cannot read or write platform admins", async () => {
  const read = await anon.from("platform_admins").select("*");
  assert.ok(read.error || read.data.length === 0);
  const write = await anon.from("platform_admins").insert({ user_id: crypto.randomUUID(), display_name: "x" });
  assert.ok(write.error);
});

test("a business owner cannot become or see a platform admin", async () => {
  const { client, id } = await signIn(SEED_OWNER);
  assert.equal(await isAdmin(client), false);
  assert.deepEqual((await client.from("platform_admins").select("*")).data, []);
  assert.ok((await client.from("platform_admins").insert({ user_id: id, display_name: "x" })).error);
  const escalate = await client.from("profiles").update({ role: "admin" }).eq("id", id);
  assert.ok(escalate.error, "owners must not be able to change their own role");
});

test("the seeded admin is recognised and sees only their own row", async () => {
  const { client, id } = await signIn(SEED_ADMIN);
  assert.equal(await isAdmin(client), true);
  const { data } = await client.from("platform_admins").select("user_id");
  assert.deepEqual(data, [{ user_id: id }]);
  assert.ok((await client.from("platform_admins").update({ display_name: "renamed" }).eq("user_id", id)).error);
});

test("the old profile role alone no longer grants admin access", async () => {
  const email = `role-only-${Date.now()}@example.test`;
  const password = crypto.randomUUID();
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "admin" } });
  assert.equal(error, null);
  created.push(data.user.id);
  const { client } = await signIn(email, password);
  assert.equal(await isAdmin(client), false);
});

test("admin:create makes a working admin, refuses existing accounts, and disable takes access away", async () => {
  const email = `script-${Date.now()}@example.test`;
  const output = script("--email", email, "--name", "Script Admin");
  const password = /password: (\S+)/.exec(output)?.[1];
  assert.ok(password, "prints a one-time password");

  const { client, id } = await signIn(email, password);
  created.push(id);
  assert.equal(await isAdmin(client), true);

  assert.throws(() => script("--email", SEED_OWNER, "--name", "Sneaky"), /could not create the account/);

  script("--email", email, "--disable");
  assert.equal(await isAdmin(client), false);
});
