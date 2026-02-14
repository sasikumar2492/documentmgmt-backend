/**
 * One-time fix: ensure User has passwordHash column and set demo password.
 * Run: npx ts-node scripts/fix-user-password-column.ts
 */
import "dotenv/config";
import { Client } from "pg";
import * as bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    // 1) Add "passwordHash" column if missing (try add; if column exists as password_hash, rename it)
    const addColumn = async () => {
      try {
        await client.query('ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT \'\'');
        console.log("Added User.passwordHash column.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists") || msg.includes("duplicate column")) {
          console.log("User.passwordHash column already exists.");
        } else if (msg.includes("password_hash") || msg.includes("password_hash")) {
          try {
            await client.query('ALTER TABLE "User" RENAME COLUMN "password_hash" TO "passwordHash"');
            console.log("Renamed password_hash to passwordHash.");
          } catch {
            throw e;
          }
        } else {
          throw e;
        }
      }
    };
    await addColumn();

    // 2) Set all users' password to bcrypt hash of 'demo123'
    const hash = await bcrypt.hash("demo123", 10);
    const res = await client.query('UPDATE "User" SET "passwordHash" = $1', [hash]);
    console.log(`Updated password for ${res.rowCount ?? 0} user(s). Login with email + demo123`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
