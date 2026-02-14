## PHASE 1 – Backend Auth & Identity API

This backend project is a Node/Express + Prisma service for the PHARMA‑DMS system. Phase 1 focuses on **auth** and **identity** so the existing React UI can later move from mock logins to real APIs.

### Tech stack

- Express 5 + TypeScript
- PostgreSQL + Prisma
- JWT (access + refresh tokens)

### Prisma schema (PostgreSQL)

The Prisma schema for Phase 1 is in `prisma/schema.prisma` and defines:

- `Organization` – optional multi‑tenant boundary.
- `Department` – functional units used for routing and dashboards.
- `User` – core identity (email, full name, password hash, active flag).
- `Role` / `Permission` + joins (`UserRole`, `RolePermission`) – RBAC backbone.
- `UserDepartment` – which departments a user belongs to.
- `RefreshToken` – future‑ready storage for server‑tracked refresh tokens.
- `PasswordResetToken` – backing store for forgot/reset password flows.

To generate the database tables:

```bash
cd documentmgmt-backend
cp .env.example .env   # then edit DATABASE_URL
npx prisma migrate dev --name init_phase1_identity
```

### Phase 1 API surface

Base prefix: `/api`

#### Auth (`/api/auth`)

- `POST /api/auth/login`
  - Body: `{ "email": string, "password": string, "context"?: "DMS" | "TicketFlow" }`
  - Response:
    - `user`: `{ id, email, fullName, roles: string[], departments: { id, name }[], orgId }`
    - `tokens`: `{ accessToken, refreshToken }`
- `POST /api/auth/refresh`
  - Body: `{ "refreshToken": string }`
  - Response: `{ tokens: { accessToken, refreshToken } }`
- `POST /api/auth/forgot-password`
  - Body: `{ "email": string }`
  - Response: `{ message: string }` (does not leak whether the email exists).
  - Phase 1 behavior: logs a reset token to the backend console; in later phases this will send real emails.
- `POST /api/auth/reset-password`
  - Body: `{ "token": string, "newPassword": string }`
  - Response: `{ message: string }`

#### Identity (`/api/identity`)

All identity routes require a valid **access token** in the `Authorization: Bearer <token>` header.

- `GET /api/identity/me`
  - Returns the current user (id, email, fullName, roles, departments, orgId) based on the JWT payload.
- `GET /api/identity/roles`
  - Returns all roles (for admin/role‑aware UI).
- `GET /api/identity/departments`
  - Returns active departments.

### Running the backend

1. Copy and edit environment variables:

```bash
cd documentmgmt-backend
cp .env.example .env
# edit .env to point DATABASE_URL at your PostgreSQL instance
```

2. Run migrations and generate Prisma client:

```bash
npx prisma migrate dev --name init_phase1_identity
```

3. Start the dev server:

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or `PORT` from `.env`), with:

- Health check: `GET /health`
- Phase 1 APIs under: `http://localhost:4000/api/...`

