# Phase 1 (1.1 & 1.2) Seed and Verification

This document describes the dummy data for **1.1 Authentication & Access** and **1.2 Dashboards & Navigation** (see `plan/PHASE_1_UI_REQUIREMENTS_ANALYSIS.md`) and how to verify that PostgreSQL has the correct data.

## Tables and data (1.1 & 1.2)

Phase 1 backend schema includes only **identity and access** tables. No Request or Template tables exist yet; dashboard KPIs and recent requests/templates return stub data until Phase 2.

| Table | Purpose (1.1 / 1.2) | Seed data |
|-------|---------------------|-----------|
| **Organization** | Tenant for DMS | 1 row: `PHARMA-DMS` (Pharma DMS Demo) |
| **Department** | Departments for users and filters | 4 rows: QA, REG, DOC, OPS |
| **Role** | Roles for auth and navigation | 8 rows: admin, requestor, manager_reviewer, manager_approver, reviewer, approver, preparator, manager |
| **Permission** | Permission keys for RBAC / navigation | 11 keys: user.manage, role.manage, department.manage, request.view, request.create, request.approve, request.reject, template.manage, template.approve, audit.view, settings.manage |
| **User** | Login and identity | 4 demo users (see below) |
| **UserRole** | User ↔ Role | 4 links (one role per demo user) |
| **UserDepartment** | User ↔ Department | 4 links (one department per demo user) |
| **RolePermission** | Role ↔ Permission | Admin: all 11; requestor/preparator/reviewer/approver/manager_*: subset (for 1.2 navigation) |
| **RefreshToken** | Optional server-side refresh tokens | Empty (JWT is stateless) |
| **PasswordResetToken** | Forgot/reset password | Empty until used |

## Demo users (aligned with frontend SignInPage)

The frontend `SignInPage` dropdown expects these four users (password for all: **demo123**):

| Email | Full name | Role | Department |
|-------|-----------|------|------------|
| sarah.admin@company.com | Sarah Johnson | admin | QA |
| john.requestor@company.com | John Smith | requestor | DOC |
| robert.manager@company.com | Robert Taylor | manager_reviewer | QA |
| patricia.approver@company.com | Patricia Davis | approver | REG |

## How to insert and verify

1. **Apply schema** (if not already done):
   ```bash
   cd documentmgmt-backend
   npx prisma db push
   ```
   Or, if you use migrations and the DB is baselined: `npx prisma migrate deploy`.

2. **Run seed** (inserts/updates dummy data):
   ```bash
   npm run seed
   ```
   You should see: “Seed completed.” and the list of demo users.

3. **Verify** (checks that 1.1 & 1.2 data are present and correct):
   ```bash
   npm run verify-seed
   ```
   All checks should pass. If any fail, fix the issue (e.g. re-run seed, fix .env `DATABASE_URL`) and run `npm run verify-seed` again.

## What the verification script checks

- Organization `PHARMA-DMS` exists.
- Departments QA, REG, DOC, OPS exist.
- Roles admin, requestor, manager_reviewer, approver (and others) exist.
- All four demo users exist with correct email, fullName, role, and department.
- Each demo user’s password is `demo123` (bcrypt).
- UserRole and UserDepartment counts and links are correct.
- RolePermission count (admin has all; other roles have a subset for navigation).

After a successful seed and verify-seed, you can use the SignInPage dropdown to log in as any of the four users and call `/api/identity/me` and `/api/identity/navigation` for 1.2.
