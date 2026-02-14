/**
 * Add missing columns so DB matches Prisma schema (camelCase), then seed can run.
 * Run: npx ts-node scripts/add-missing-columns.ts
 */
import "dotenv/config";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const alter = (table: string, column: string, def: string) =>
  `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${def}`;

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const statements: [string, string][] = [
    ["Organization", "isActive BOOLEAN NOT NULL DEFAULT true"],
    ["Organization", "createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Organization", "updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Department", "isActive BOOLEAN NOT NULL DEFAULT true"],
    ["Department", "organizationId TEXT"],
    ["Department", "createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Department", "updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Role", "description TEXT"],
    ["Role", "isSystem BOOLEAN NOT NULL DEFAULT false"],
    ["Role", "createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Role", "updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Permission", "description TEXT"],
    ["Permission", "createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["Permission", "updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["User", "passwordHash TEXT NOT NULL DEFAULT ''"],
    ["User", "fullName TEXT NOT NULL DEFAULT ''"],
    ["User", "isActive BOOLEAN NOT NULL DEFAULT true"],
    ["User", "organizationId TEXT"],
    ["User", "createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["User", "updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["UserRole", "assignedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["UserDepartment", "assignedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP"],
  ];

  for (const [table, def] of statements) {
    const [col, ...rest] = def.split(" ");
    const typeDef = rest.join(" ");
    try {
      await client.query(alter(table, col, typeDef));
      console.log(`Added ${table}.${col}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists") && !msg.includes("duplicate")) console.error(table, col, msg);
    }
  }
  await client.end();
  console.log("Done. Run: npm run seed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
