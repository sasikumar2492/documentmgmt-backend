import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { AppError } from "../errors/AppError";
import {
  signAccessToken,
  signRefreshToken,
  type JwtPayload,
} from "../utils/jwt";

export interface LoginInput {
  email: string;
  password: string;
  context?: "DMS" | "TicketFlow";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  departments: { id: string; name: string }[];
  orgId?: string | null;
}

export async function login(input: LoginInput): Promise<{
  tokens: AuthTokens;
  user: AuthUserDto;
}> {
  const { email, password, context } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      isActive: true,
      organizationId: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  let roles: string[] = [];
  let departments: { id: string; name: string }[] = [];
  try {
    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
    });
    if (userWithRelations?.roles) roles = userWithRelations.roles.map((r) => r.role.name);
    if (userWithRelations?.departments) departments = userWithRelations.departments.map((d) => ({ id: d.departmentId, name: d.department.name }));
  } catch {
    // UserRole/UserDepartment tables may not exist; login still succeeds with empty roles/departments
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    roles,
    departmentIds: departments.map((d) => d.id),
    orgId: user.organizationId,
    context: context ?? "DMS",
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({
    sub: user.id,
    context: payload.context,
  });

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      departments,
      orgId: user.organizationId,
    },
  };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  // Stateless JWT refresh; rotation strategy can be added later using RefreshToken model
  if (!refreshToken) {
    throw new AppError(400, "MISSING_REFRESH_TOKEN", "Refresh token is required");
  }

  // Lazy‑load here to avoid circular dependency
  const { verifyRefreshToken } = await import("../utils/jwt");
  const decoded = verifyRefreshToken(refreshToken);

  let user: {
    id: string;
    email: string;
    isActive: boolean;
    organizationId: string | null;
    roles: { role: { name: string } }[];
    departments?: { departmentId: string }[];
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
        organization: true,
      },
    });
  } catch (e: unknown) {
    // P2021 = table does not exist (e.g. UserDepartment missing before migrations)
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2021") {
      user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          roles: { include: { role: true } },
          organization: true,
        },
      });
    } else {
      throw e;
    }
  }

  if (!user || !user.isActive) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "User not found or inactive");
  }

  const roles = user.roles.map((r) => r.role.name);
  const departmentIds = user.departments ? user.departments.map((d) => d.departmentId) : [];

  const newAccessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    roles,
    departmentIds,
    orgId: user.organizationId,
    context: decoded.context,
  });

  const newRefreshToken = signRefreshToken({
    sub: user.id,
    context: decoded.context,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

function isPrismaTableMissingError(e: unknown): boolean {
  return (
    e != null &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code: string }).code === "P2021"
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Do not reveal whether the email exists
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  try {
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  } catch (e: unknown) {
    if (isPrismaTableMissingError(e)) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Password reset is temporarily unavailable. Run in documentmgmt-backend: npx prisma db push"
      );
    }
    throw e;
  }

  // In Phase 1, we only log/reset; actual email integration will be refined later.
  // eslint-disable-next-line no-console
  console.log(
    `Password reset token for ${email}: ${rawToken} (send via email in production)`
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    const tokens = await prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    let match:
      | (typeof tokens)[number] & {
          user: { id: string };
        }
      | null = null;

    for (const t of tokens) {
      const ok = await bcrypt.compare(token, t.tokenHash);
      if (ok) {
        const withUser = await prisma.passwordResetToken.findUnique({
          where: { id: t.id },
          include: { user: true },
        });
        if (withUser) {
          match = withUser;
          break;
        }
      }
    }

    if (!match) {
      throw new AppError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: match.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: match.id },
        data: { usedAt: new Date() },
      }),
    ]);
  } catch (e: unknown) {
    if (isPrismaTableMissingError(e)) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Password reset is temporarily unavailable. Run in documentmgmt-backend: npx prisma db push"
      );
    }
    throw e;
  }
}

