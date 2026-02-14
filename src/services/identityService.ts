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

