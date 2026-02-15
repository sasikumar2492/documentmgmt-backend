/**
 * Verify Phase 1 (1.1 & 1.2) dummy data in PostgreSQL after running seed.
 * Run: npx ts-node scripts/verify-phase1-seed.ts
 * Expect: Run after "npm run seed"; uses DATABASE_URL from .env.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";

async function verify() {
  const errors: string[] = [];
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  // 1.1 & 1.2 tables and expected data (from PHASE_1_UI_REQUIREMENTS_ANALYSIS.md + SignInPage)

  const orgCount = await prisma.organization.count();
  const orgOk = orgCount >= 1;
  checks.push({ name: "Organization (1.1)", ok: orgOk, detail: `count=${orgCount}, expected >= 1` });
  if (!orgOk) errors.push("Missing Organization (e.g. PHARMA-DMS)");

  const org = await prisma.organization.findFirst({ where: { code: "PHARMA-DMS" } });
  if (!org) {
    errors.push("Organization with code PHARMA-DMS not found");
  } else {
    checks.push({ name: "Organization PHARMA-DMS", ok: true });
  }

  const deptCount = await prisma.department.count();
  const deptOk = deptCount >= 4;
  checks.push({ name: "Departments (1.1)", ok: deptOk, detail: `count=${deptCount}, expected >= 4 (QA, REG, DOC, OPS)` });
  if (!deptOk) errors.push("Need at least 4 departments: QA, REG, DOC, OPS");

  for (const code of ["QA", "REG", "DOC", "OPS"]) {
    const d = await prisma.department.findUnique({ where: { code } });
    checks.push({ name: `Department ${code}`, ok: !!d });
    if (!d) errors.push(`Department ${code} not found`);
  }

  const roleCount = await prisma.role.count();
  const roleOk = roleCount >= 8;
  checks.push({ name: "Roles (1.1 / 1.2)", ok: roleOk, detail: `count=${roleCount}, expected >= 8` });
  if (!roleOk) errors.push("Need roles: admin, requestor, manager_reviewer, manager_approver, reviewer, approver, preparator, manager");

  for (const name of ["admin", "requestor", "manager_reviewer", "approver"]) {
    const r = await prisma.role.findUnique({ where: { name } });
    checks.push({ name: `Role ${name}`, ok: !!r });
    if (!r) errors.push(`Role ${name} not found (required by SignInPage)`);
  }

  const permCount = await prisma.permission.count();
  checks.push({ name: "Permissions (1.2)", ok: permCount >= 10, detail: `count=${permCount}` });

  const userCount = await prisma.user.count();
  const userOk = userCount >= 4;
  checks.push({ name: "Users (1.1)", ok: userOk, detail: `count=${userCount}, expected >= 4 demo users` });
  if (!userOk) errors.push("Need at least 4 demo users for SignInPage dropdown");

  // Frontend SignInPage expects these exact emails (1.1)
  const expectedUsers = [
    { email: "sarah.admin@company.com", fullName: "Sarah Johnson", roleName: "admin", departmentCode: "QA" },
    { email: "john.requestor@company.com", fullName: "John Smith", roleName: "requestor", departmentCode: "DOC" },
    { email: "robert.manager@company.com", fullName: "Robert Taylor", roleName: "manager_reviewer", departmentCode: "QA" },
    { email: "patricia.approver@company.com", fullName: "Patricia Davis", roleName: "approver", departmentCode: "REG" },
  ];

  for (const u of expectedUsers) {
    const user = await prisma.user.findUnique({
      where: { email: u.email },
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
    });
    const found = !!user;
    const hasRole = !!user?.roles.some((ur) => ur.role.name === u.roleName);
    const hasDept = !!user?.departments.some((ud) => ud.department.code === u.departmentCode);
    checks.push({
      name: `User ${u.email}`,
      ok: found && hasRole && hasDept,
      detail: found ? `roles=${user!.roles.map((r) => r.role.name).join(",")} depts=${user!.departments.map((d) => d.department.code).join(",")}` : "missing",
    });
    if (!found) errors.push(`User ${u.email} not found (SignInPage dropdown)`);
    else if (!hasRole) errors.push(`User ${u.email} missing role ${u.roleName}`);
    else if (!hasDept) errors.push(`User ${u.email} missing department ${u.departmentCode}`);
  }

  const userRoleCount = await prisma.userRole.count();
  checks.push({ name: "UserRole (1.1)", ok: userRoleCount >= 4, detail: `count=${userRoleCount}` });

  const userDeptCount = await prisma.userDepartment.count();
  checks.push({ name: "UserDepartment (1.1)", ok: userDeptCount >= 4, detail: `count=${userDeptCount}` });

  const rolePermCount = await prisma.rolePermission.count();
  checks.push({ name: "RolePermission (1.2 navigation)", ok: rolePermCount >= 11, detail: `count=${rolePermCount} (admin has all; others have subset)` });

  // Password check: all demo users should have bcrypt hash of demo123
  const bcrypt = await import("bcryptjs");
  for (const u of expectedUsers) {
    const user = await prisma.user.findUnique({ where: { email: u.email } });
    if (user) {
      const passwordOk = await bcrypt.compare(DEMO_PASSWORD, user.passwordHash);
      checks.push({ name: `Password ${u.email} = ${DEMO_PASSWORD}`, ok: passwordOk });
      if (!passwordOk) errors.push(`User ${u.email} password is not ${DEMO_PASSWORD}`);
    }
  }

  // Print report
  console.log("\n--- Phase 1 (1.1 & 1.2) seed verification ---\n");
  for (const c of checks) {
    const icon = c.ok ? "✓" : "✗";
    console.log(`  ${icon} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  }
  console.log("");

  if (errors.length > 0) {
    console.log("Errors:");
    errors.forEach((e) => console.log("  -", e));
    console.log("\nRun: npm run seed");
    process.exit(1);
  }

  console.log("All checks passed. 1.1 (Auth & Access) and 1.2 (Dashboards & Navigation) dummy data are correctly inserted.\n");
}

verify()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
