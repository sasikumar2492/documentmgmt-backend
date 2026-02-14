import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: "PHARMA-DMS" },
    update: {},
    create: {
      name: "Pharma DMS Demo",
      code: "PHARMA-DMS",
      isActive: true,
    },
  });

  // 2. Departments
  const deptNames = [
    { name: "Quality Assurance", code: "QA" },
    { name: "Regulatory", code: "REG" },
    { name: "Document Control", code: "DOC" },
    { name: "Operations", code: "OPS" },
  ];

  const departments: Awaited<ReturnType<typeof prisma.department.upsert>>[] = [];
  for (const d of deptNames) {
    departments.push(
      await prisma.department.upsert({
        where: { code: d.code },
        update: {},
        create: {
          name: d.name,
          code: d.code,
          isActive: true,
          organizationId: org.id,
        },
      })
    );
  }

  // 3. Roles (match frontend: admin, requestor, manager_reviewer, approver + extras)
  const roleNames = [
    "admin",
    "requestor",
    "manager_reviewer",
    "manager_approver",
    "reviewer",
    "approver",
    "preparator",
    "manager",
  ];

  const roles: Awaited<ReturnType<typeof prisma.role.upsert>>[] = [];
  for (const name of roleNames) {
    roles.push(
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, isSystem: true },
      })
    );
  }

  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));

  // 4. Permissions (sample keys for RBAC) – sequential to avoid connection exhaustion
  const permissionKeys = [
    "user.manage",
    "role.manage",
    "department.manage",
    "request.view",
    "request.create",
    "request.approve",
    "request.reject",
    "template.manage",
    "template.approve",
    "audit.view",
    "settings.manage",
  ];

  const permissions: Awaited<ReturnType<typeof prisma.permission.upsert>>[] = [];
  for (const key of permissionKeys) {
    permissions.push(
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      })
    );
  }

  // Grant admin all permissions; others get subset
  const adminRole = roleMap["admin"]!;
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: p.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  const qaDept = departments.find((d) => d.code === "QA")!;
  const docDept = departments.find((d) => d.code === "DOC")!;

  // 5. Demo users (match SignInPage dropdown)
  const demoUsers = [
    {
      email: "sarah.admin@company.com",
      fullName: "Sarah Johnson",
      roleName: "admin",
      departmentCode: "QA",
    },
    {
      email: "john.requestor@company.com",
      fullName: "John Smith",
      roleName: "requestor",
      departmentCode: "DOC",
    },
    {
      email: "robert.manager@company.com",
      fullName: "Robert Taylor",
      roleName: "manager_reviewer",
      departmentCode: "QA",
    },
    {
      email: "patricia.approver@company.com",
      fullName: "Patricia Davis",
      roleName: "approver",
      departmentCode: "REG",
    },
  ];

  for (const u of demoUsers) {
    const username = u.email.split("@")[0];
    const existing = await prisma.user.findFirst({ where: { email: u.email } });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, fullName: u.fullName, isActive: true, username },
        })
      : await prisma.user.create({
          data: {
            email: u.email,
            username,
            passwordHash,
            fullName: u.fullName,
            isActive: true,
            organizationId: org.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

    const role = roleMap[u.roleName];
    const dept = departments.find((d) => d.code === u.departmentCode);

    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: role.id },
        },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    if (dept) {
      await prisma.userDepartment.upsert({
        where: {
          userId_departmentId: { userId: user.id, departmentId: dept.id },
        },
        update: {},
        create: { userId: user.id, departmentId: dept.id },
      });
    }
  }

  console.log("Seed completed.");
  console.log("Demo users (password for all: " + DEMO_PASSWORD + "):");
  demoUsers.forEach((u) => console.log("  -", u.email, "→", u.roleName));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
