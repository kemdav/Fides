// usage: node scripts/hash-admin-password.mjs "<password>"
// prints a value for the passwordHash field of ADMIN_ACCOUNTS (see .env.example)
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('usage: node scripts/hash-admin-password.mjs "<password of at least 12 characters>"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
