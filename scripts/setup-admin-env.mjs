// usage: npm run setup:admin [-- --file .env.local] [-- --username you@example.com]
// adds ADMIN_SESSION_SECRET and a local admin account to .env.local when they are missing, and prints the login once
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const file = option("file", ".env.local");
const username = option("username", "admin@fides.local");

const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (key) => new RegExp(`^${key}=.+`, "m").test(current);

const additions = [];
if (!has("ADMIN_SESSION_SECRET")) additions.push(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`);

let password = null;
if (!has("ADMIN_ACCOUNTS")) {
  password = randomBytes(12).toString("base64url");
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  const accounts = [{ id: "admin-1", username, displayName: "Admin", passwordHash: `scrypt:${salt.toString("hex")}:${hash.toString("hex")}` }];
  additions.push(`ADMIN_ACCOUNTS='${JSON.stringify(accounts)}'`);
}

if (additions.length === 0) {
  console.log(`${file} already has ADMIN_SESSION_SECRET and ADMIN_ACCOUNTS, nothing to do.`);
  process.exit(0);
}

const separator = current && !current.endsWith("\n") ? "\n" : "";
writeFileSync(file, `${current}${separator}${additions.join("\n")}\n`);
console.log(`updated ${file}. restart the dev server.`);
if (password) console.log(`admin login at /admin/login -> username: ${username}  password: ${password}  (shown once, only the hash is stored)`);
