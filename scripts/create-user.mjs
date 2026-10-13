// Creates (or resets the password of) the single login account used to access
// the app. Uses the same salt:hash scrypt format as src/lib/auth/password.ts —
// keep the two in sync if that file's hashing scheme ever changes.
//
// Run: node scripts/create-user.mjs <email> <password> [admin|advisor]
// (role defaults to advisor; the accounts page at /comptes is the normal way
// to manage accounts once an admin exists, this is the bootstrap path)
import "dotenv/config";
import { Client } from "pg";
import { randomBytes, randomUUID, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

const [, , email, password, roleArg = "advisor"] = process.argv;

if (!email || !password || !["admin", "advisor"].includes(roleArg)) {
  console.error("Usage: node scripts/create-user.mjs <email> <password> [admin|advisor]");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const passwordHash = await hashPassword(password);
  const normalizedEmail = email.trim().toLowerCase();

  await client.query(
    `INSERT INTO "User" (id, email, "passwordHash", role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role`,
    [randomUUID(), normalizedEmail, passwordHash, roleArg]
  );

  console.log(`Compte prêt : ${normalizedEmail} (${roleArg})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
