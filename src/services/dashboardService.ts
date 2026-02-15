import type { JwtPayload } from "../utils/jwt";

/**
 * Dashboard aggregates. Phase 1: no Request/Template models yet — return stub data.
 * Replace with real DB queries when Request and Template entities exist.
 */

const DEFAULT_RANGE = "30d";

function parseRange(range?: string): { days: number } {
  switch (range) {
    case "7d":
      return { days: 7 };
    case "90d":
      return { days: 90 };
    default:
      return { days: 30 };
  }
}

export interface RequestCountsResult {
  total: number;
  byStatus: Record<string, number>;
  byDepartment: Array<{ departmentId: string; departmentCode: string; departmentName: string; pending: number; approved: number; rejected: number }>;
  byRole: Array<{ roleId: string; roleName: string; pending: number; approved: number }>;
}

export async function getRequestCounts(
  _payload: JwtPayload,
  range?: string
): Promise<RequestCountsResult> {
  const _ = parseRange(range ?? DEFAULT_RANGE);
  return {
    total: 0,
    byStatus: { pending: 0, submitted: 0, "in-review": 0, approved: 0, rejected: 0 },
    byDepartment: [],
    byRole: [],
  };
}

export interface RecentRequestItem {
  id: string;
  requestId: string;
  fileName: string;
  documentType: string;
  department: string;
  departmentId: string;
  status: string;
  submittedDate: string;
  lastModified: string;
  assignedTo: string;
  uploadedBy: string;
  priority: string;
}

export async function getRecentRequests(
  _payload: JwtPayload,
  limit = 10,
  _range?: string
): Promise<{ items: RecentRequestItem[] }> {
  return { items: [] };
}

export interface RecentTemplateItem {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: string;
  department: string;
  departmentId: string;
  status: string;
}

export async function getRecentTemplates(
  _payload: JwtPayload,
  limit = 10,
  _range?: string
): Promise<{ items: RecentTemplateItem[] }> {
  return { items: [] };
}

export interface KpisResult {
  totalRequests: number;
  totalApproved: number;
  pendingApproval: number;
  rejectedCount: number;
  totalTemplates: number;
  totalUsers: number;
  totalDepartments: number;
  approvalRatePercent: number;
}

export async function getKpis(
  payload: JwtPayload,
  range?: string
): Promise<KpisResult> {
  const _ = parseRange(range ?? DEFAULT_RANGE);
  const { prisma } = await import("../config/prisma");
  let totalUsers = 0;
  let totalDepartments = 0;
  try {
    totalUsers = await prisma.user.count({ where: { isActive: true } });
    totalDepartments = await prisma.department.count({ where: { isActive: true } });
  } catch {
    // ignore if tables missing
  }
  return {
    totalRequests: 0,
    totalApproved: 0,
    pendingApproval: 0,
    rejectedCount: 0,
    totalTemplates: 0,
    totalUsers,
    totalDepartments,
    approvalRatePercent: 0,
  };
}
