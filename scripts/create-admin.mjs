// usage: npm run admin:create -- --email you@example.com --name "Your Name"
//        npm run admin:create -- --email you@example.com --disable
// creates a platform admin in Supabase Auth and prints a one-time password.
// it never promotes an existing account, so a merchant login can't become an admin by accident.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const stop = (message) => {
  console.error(message);
  process.exit(1);
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) stop("set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const email = option("email")?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop('usage: npm run admin:create -- --email you@example.com --name "Your Name"');

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
console.log(`project: ${new URL(url).host}`);

async function disable() {
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) stop("no account with that email");
  const { data, error } = await supabase.from("platform_admins").update({ active: false }).eq("user_id", profile.id).select("user_id");
  if (error) stop(`could not disable: ${error.message}`);
  if (!data.length) stop("that account is not a platform admin");
  console.log(`${email} can no longer use the admin portal.`);
}

async function create() {
  const name = option("name")?.trim();
  if (!name) stop('add --name "Your Name"');

  const password = randomBytes(15).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: name },
  });
  if (error) stop(`could not create the account: ${error.message}`);

  const { error: adminError } = await supabase.from("platform_admins").insert({ user_id: data.user.id, display_name: name });
  if (adminError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    stop(`could not register the admin (did you run the migrations?): ${adminError.message}`);
  }

  console.log(`admin created. sign in at /admin/login\n  email:    ${email}\n  password: ${password}\n(shown once)`);
}

// no process.exit on success: exiting while sockets are open crashes node on windows
await (args.includes("--disable") ? disable() : create());
