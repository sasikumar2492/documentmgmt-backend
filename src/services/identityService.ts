import { prisma } from "../config/prisma";
import type { JwtPayload } from "../utils/jwt";
import { AppError } from "../errors/AppError";

export async function getCurrentUser(payload: JwtPayload) {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      roles: { include: { role: true } },
      departments: { include: { department: true } },
      organization: true,
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles.map((r) => r.role.name),
    departments: user.departments.map((d) => ({
      id: d.departmentId,
      name: d.department.name,
    })),
    orgId: user.organizationId,
  };
}

export async function listRoles() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });
  return roles;
}

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return departments;
}

/** Role → route IDs visible in LeftSidebar / AdminSidebar (matches frontend ViewType) */
const ROLE_ROUTE_IDS: Record<string, string[]> = {
  admin: [
    "dashboard", "document-management", "raise-request", "document-library", "document-effectiveness",
    "activity-log", "reports-analytics", "audit-logs", "document-versioning",
    "admin-home", "user-management", "department-setup", "enterprise", "role-permissions",
  ],
  requestor: ["dashboard", "document-management", "raise-request", "document-library", "document-effectiveness", "activity-log"],
  preparator: ["dashboard", "document-management", "raise-request", "document-library", "document-effectiveness", "activity-log"],
  manager: ["dashboard", "document-library", "document-effectiveness", "activity-log", "reports-analytics", "document-versioning"],
  manager_reviewer: ["dashboard", "document-library", "activity-log", "reports-analytics"],
  manager_approver: ["dashboard", "document-library", "activity-log", "reports-analytics"],
  reviewer: ["dashboard", "document-library", "document-effectiveness", "activity-log", "reports-analytics"],
  approver: ["dashboard", "document-library", "document-effectiveness", "activity-log", "reports-analytics"],
};

export interface NavigationResult {
  allowedRouteIds: string[];
  permissions: string[];
  roles: string[];
  isAdmin: boolean;
}

export async function getNavigation(payload: JwtPayload): Promise<NavigationResult> {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
      departments: { include: { department: true } },
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const roles = user.roles.map((r) => r.role.name);
  const permissionKeys = new Set<string>();
  const routeIds = new Set<string>();

  type RoleWithPermissions = { name: string; permissions?: Array<{ permission: { key: string } | null }> };
  for (const ur of user.roles) {
    const role = ur.role as RoleWithPermissions;
    const roleName = role.name.toLowerCase();
    for (const r of ROLE_ROUTE_IDS[roleName] ?? []) {
      routeIds.add(r);
    }
    for (const rp of role.permissions ?? []) {
      if (rp.permission?.key) permissionKeys.add(rp.permission.key);
    }
  }

  const isAdmin = roles.some((r) => r.toLowerCase() === "admin");

  return {
    allowedRouteIds: Array.from(routeIds).sort(),
    permissions: Array.from(permissionKeys).sort(),
    roles,
    isAdmin,
  };
}

