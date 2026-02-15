# 1.2 Dashboards & Navigation – Backend API Details

This document defines the backend API contract for **Dashboards & Navigation** (section 1.2), aligned with the existing frontend in `documentmgmt-frontend` (Dashboard, PreparatorDashboard, AdminHomeDashboard, LeftSidebar, AdminSidebar). **No frontend code changes are required**; the frontend will call these APIs when wired to the backend.

---

## 1. Logout API (done)

Used so the client can clear tokens and optionally revoke refresh token.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/logout` | No (optional body) | Logout; client should discard tokens. |

**Request body (optional):**
```json
{ "refreshToken": "<current refresh token>" }
```

**Response (200):**
```json
{ "message": "Logged out successfully. Client should discard tokens." }
```

---

## 2. Navigation / Role–Permission Info (Sidebars)

Sidebars need to know **which modules/routes are available** for the current user (by role). The frontend already has `userRole` from `/api/identity/me` and filters menu items locally. To centralize rules and support permission keys, the backend can expose an explicit **navigation** response.

### 2.1 GET `/api/identity/me` (existing)

Returns user with `roles`, `departments`, `orgId`. Frontend uses `roles[0]` or primary role as `userRole` for sidebar visibility.

### 2.2 GET `/api/identity/navigation` (new)

Returns **allowed route IDs and permission keys** for the current user. Used to drive LeftSidebar / AdminSidebar without hardcoding role–route mapping in the frontend.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "allowedRouteIds": [
    "dashboard",
    "document-management",
    "raise-request",
    "document-library",
    "reports-analytics",
    "activity-log",
    "audit-logs"
  ],
  "permissions": ["request.view", "request.create", "template.manage", "audit.view"],
  "roles": ["admin"],
  "isAdmin": true
}
```

- **allowedRouteIds**: List of view/route IDs the user can see (matches `ViewType` / sidebar item IDs in frontend).
- **permissions**: List of permission keys (from Role → RolePermission → Permission) for fine-grained UI/API checks.
- **roles**: User’s role names.
- **isAdmin**: Convenience flag for admin-only sections (e.g. AdminSidebar, Audit Logs).

**Filtering rule (backend):** Derive `allowedRouteIds` from user’s roles and a fixed role–route mapping (e.g. admin → all routes; requestor → dashboard, raise-request, document-library; preparator → dashboard, document-management, raise-request, document-library, activity-log; reviewer/approver → document-library, reports-analytics, activity-log; etc.), matching the logic in `LeftSidebar` / `AdminSidebar`.

---

## 3. Dashboard Aggregated Data

Dashboards show **assigned requests by status**, **recent templates/documents**, and **KPIs (counts, charts)**. All dashboard endpoints are **scoped by the current user** (and optionally by role/department and time range).

### 3.1 Request counts (KPIs and filters)

Used for: Dashboard KPI cards, PreparatorDashboard stats, AdminHomeDashboard “Active Requests”, and chart data (e.g. Record Summary donut, Budget Analysis bar chart).

#### GET `/api/dashboard/request-counts`

Returns counts of requests grouped by status and optionally by role/department. Supports time range.

**Headers:** `Authorization: Bearer <accessToken>`

**Query parameters:**

| Parameter    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `range`     | string | No       | `7d` \| `30d` \| `90d` (default: `30d`) |
| `groupBy`   | string | No       | `status` \| `department` \| `role` (default: `status`) |

**Response (200):**
```json
{
  "total": 42,
  "byStatus": {
    "pending": 10,
    "submitted": 5,
    "in-review": 8,
    "approved": 15,
    "rejected": 4
  },
  "byDepartment": [
    { "departmentId": "id", "departmentCode": "QA", "departmentName": "Quality Assurance", "pending": 2, "approved": 6, "rejected": 1 }
  ],
  "byRole": [
    { "roleId": "id", "roleName": "requestor", "pending": 3, "approved": 5 }
  ]
}
```

- For **Dashboard** “Record Summary” donut: use `byStatus` (e.g. approved, pending, rejected) and optionally filter by `range`.
- For **Budget Analysis** bar chart: use `byDepartment` with `approved` / `pending` (and optionally `rejected`).
- For **PreparatorDashboard** KPI cards: use `total`, `byStatus.pending`, `byStatus.approved`, and count of “needs-revision” if applicable; scope to current user’s requests.
- **Filters:** Backend must restrict to:
  - **Current user** (e.g. “my requests” for preparator/requestor).
  - **Roles/departments** the user is allowed to see (e.g. admin sees all; manager sees department; reviewer sees assigned).
  - **Time range** from `range` (last 7/30/90 days).

---

### 3.2 Recent requests and recent templates

Used for: “Recent Records”, “Recent Tasks”, “Recent Activity” on Dashboard and PreparatorDashboard.

#### GET `/api/dashboard/recent-requests`

Returns recently created/updated **requests** for the current user (and visibility rules). Supports limit and time range.

**Headers:** `Authorization: Bearer <accessToken>`

**Query parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `limit`   | number | No       | Default 10, max 50 |
| `range`   | string | No       | `7d` \| `30d` \| `90d` (default: `30d`) |

**Response (200):**
```json
{
  "items": [
    {
      "id": "request-id",
      "requestId": "REQ-001",
      "fileName": "Part_Approval_Form.xlsx",
      "documentType": "Request",
      "department": "QA",
      "departmentId": "dept-id",
      "status": "pending",
      "submittedDate": "2026-02-14T10:00:00Z",
      "lastModified": "2026-02-14T12:00:00Z",
      "assignedTo": "john.requestor@company.com",
      "uploadedBy": "sarah.admin@company.com",
      "priority": "medium"
    }
  ]
}
```

Shape should align with frontend `ReportData` / PreparatorDashboard “Recent Activity” and “All Reports” table.

#### GET `/api/dashboard/recent-templates`

Returns recently created/updated **templates** (or document templates) visible to the current user.

**Headers:** `Authorization: Bearer <accessToken>`

**Query parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `limit`   | number | No       | Default 10, max 50 |
| `range`   | string | No       | `7d` \| `30d` \| `90d` |

**Response (200):**
```json
{
  "items": [
    {
      "id": "template-id",
      "fileName": "Part_Approval_Template_v2.xlsx",
      "uploadDate": "2026-02-01T09:00:00Z",
      "fileSize": "1.2 MB",
      "department": "QA",
      "departmentId": "dept-id",
      "status": "approved"
    }
  ]
}
```

Align with frontend `TemplateData` where used (e.g. Dashboard “Recent Records” and template counts).

---

### 3.3 Dashboard KPIs (single aggregate endpoint)

Single endpoint that returns all KPI numbers needed for Dashboard and AdminHomeDashboard cards (to reduce round-trips).

#### GET `/api/dashboard/kpis`

Returns aggregated counts for the current user’s context (and role/department filters).

**Headers:** `Authorization: Bearer <accessToken>`

**Query parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `range`   | string | No       | `7d` \| `30d` \| `90d` (default: `30d`) |

**Response (200):**
```json
{
  "totalRequests": 42,
  "totalApproved": 15,
  "pendingApproval": 10,
  "rejectedCount": 4,
  "totalTemplates": 8,
  "totalUsers": 248,
  "totalDepartments": 12,
  "approvalRatePercent": 36
}
```

- **Dashboard** uses: `totalRequests`, `totalApproved`, `pendingApproval`, `totalTemplates`, `rejectedCount`, `approvalRatePercent`.
- **AdminHomeDashboard** uses: `totalUsers`, `totalRequests` (as “Active Requests”), `totalDepartments`, and optionally a “System Health” value (can be static or from a separate health check).
- **PreparatorDashboard** can use the same endpoint or rely on `request-counts` + “my requests” scope; either way, counts must be scoped to the current user when applicable.

---

## 4. Summary Table

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/auth/logout` | Logout; client discards tokens. |
| GET    | `/api/identity/navigation` | Allowed route IDs + permissions for sidebars. |
| GET    | `/api/dashboard/request-counts` | Counts by status/department/role + time range. |
| GET    | `/api/dashboard/recent-requests` | Recent requests for current user. |
| GET    | `/api/dashboard/recent-templates` | Recent templates. |
| GET    | `/api/dashboard/kpis` | KPI counts (requests, approved, pending, templates, users, departments, approval rate). |

---

## 5. Filters and Scoping Rules

- **Current user:** All dashboard endpoints must respect the authenticated user (from JWT). “My requests” = created by or assigned to the current user when the role is requestor/preparator.
- **Roles:** Admin can see all requests/departments; manager can see their department(s); reviewer/approver see assigned items; requestor/preparator see their own.
- **Departments:** Filter by user’s `departmentIds` when the user is not admin.
- **Time ranges:** `range` = `7d` | `30d` | `90d` applied to request/template `createdAt` or `updatedAt` (and optionally custom start/end in a later iteration).

---

## 6. Implementation Notes

- **Phase 1:** Backend currently has **no Request or Template entities** in Prisma (identity only). Dashboard endpoints return **stub data** (zeros, empty arrays); replace with real DB queries when Request and Template (and workflow) models exist.
- **Implemented:**
  - **Logout:** `POST /api/auth/logout` — returns 200; client should discard tokens.
  - **Navigation:** `GET /api/identity/navigation` — returns `allowedRouteIds`, `permissions`, `roles`, `isAdmin` from current user’s roles and RolePermission.
  - **Dashboard:** `GET /api/dashboard/kpis`, `request-counts`, `recent-requests`, `recent-templates` — all require `Authorization: Bearer <accessToken>`; currently return stub data (KPIs include real `totalUsers` / `totalDepartments` from Prisma).
