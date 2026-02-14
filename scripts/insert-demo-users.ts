/**
 * Insert demo users via raw SQL (matches DB column names: snake_case).
 * Run: NODE_TLS_REJECT_UNAUTHORIZED=0 npx ts-node scripts/insert-demo-users.ts
 */
import "dotenv/config";
import { Client } from "pg";
import * as bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const DEMO_PASSWORD = "demo123";
const demoUsers = [
  { email: "sarah.admin@company.com", full_name: "Sarah Johnson", role: "admin", dept_code: "QA" },
  { email: "john.requestor@company.com", full_name: "John Smith", role: "requestor", dept_code: "DOC" },
  { email: "robert.manager@company.com", full_name: "Robert Taylor", role: "manager_reviewer", dept_code: "QA" },
  { email: "patricia.approver@company.com", full_name: "Patricia Davis", role: "approver", dept_code: "REG" },
];

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Get org id (create if needed)
  let orgId: string | null = null;
  const orgRes = await client.query('SELECT id FROM "Organization" WHERE code = $1 LIMIT 1', ["PHARMA-DMS"]);
  if (orgRes.rows[0]) orgId = orgRes.rows[0].id;
  else {
    const insertOrg = await client.query(
      'INSERT INTO "Organization" (id, name, code, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW()) RETURNING id',
      ["Pharma DMS Demo", "PHARMA-DMS"]
    );
    orgId = insertOrg.rows[0]?.id ?? null;
  }

  // Get role ids
  const roleRes = await client.query('SELECT id, name FROM "Role"');
  const roleById = Object.fromEntries(roleRes.rows.map((r: { id: string; name: string }) => [r.name, r.id]));

  // Get department ids
  const deptRes = await client.query('SELECT id, code FROM "Department"');
  const deptByCode = Object.fromEntries(deptRes.rows.map((r: { id: string; code: string }) => [r.code, r.id]));

  for (const u of demoUsers) {
    const username = u.email.split("@")[0];
    const userIdRes = await client.query(
      'SELECT id FROM "User" WHERE email = $1 LIMIT 1',
      [u.email]
    );
    let userId: string;
    if (userIdRes.rows[0]) {
      userId = userIdRes.rows[0].id;
      await client.query(
        `UPDATE "User" SET password_hash = $1, "passwordHash" = $1, full_name = $2, "fullName" = $2, "updatedAt" = NOW() WHERE id = $3`,
        [passwordHash, u.full_name, userId]
      );
      console.log("Updated:", u.email);
    } else {
      const idRes = await client.query(
        `INSERT INTO "User" (id, email, username, password_hash, "passwordHash", full_name, "fullName", "isActive", "organizationId", created_at, updated_at, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $3, $4, $4, true, $5, NOW(), NOW(), NOW(), NOW())
         RETURNING id`,
        [u.email, username, passwordHash, u.full_name, orgId]
      );
      userId = idRes.rows[0].id;
      console.log("Created:", u.email);
    }

    const roleId = roleById[u.role];
    if (roleId) {
      try {
        await client.query(
          `INSERT INTO "UserRole" ("userId", "roleId", "assignedAt") VALUES ($1, $2, NOW())
           ON CONFLICT ("userId", "roleId") DO NOTHING`,
          [userId, roleId]
        );
      } catch (_) { /* table may not exist */ }
    }
    const deptId = deptByCode[u.dept_code];
    if (deptId) {
      try {
        await client.query(
          `INSERT INTO "UserDepartment" ("userId", "departmentId", "assignedAt") VALUES ($1, $2, NOW())
           ON CONFLICT ("userId", "departmentId") DO NOTHING`,
          [userId, deptId]
        );
      } catch (_) { /* table may not exist */ }
    }
  }

  await client.end();
  console.log("Demo users ready. Password for all:", DEMO_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
