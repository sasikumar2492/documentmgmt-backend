# Prisma migrations – PostgreSQL

## 1. Set your database URL

In the project root, ensure `.env` exists and has a valid PostgreSQL URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Examples:
- **Local:** `postgresql://postgres:postgres@localhost:5432/pharma_dms?schema=public`
- **Aiven/cloud:** use the connection string from your provider (often with `?sslmode=require` for SSL).

Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE` with your actual values.

## 2. Create and apply the first migration

From the **documentmgmt-backend** folder:

```bash
npx prisma migrate dev --name init_phase1_identity
```

This will:
- Create the `prisma/migrations` folder and a new migration file
- Apply the migration to your PostgreSQL database (create all tables)
- Run `prisma generate` so the Prisma client stays in sync

## 3. If you get errors

- **"Can't reach database"** – Check `DATABASE_URL`, firewall, and that PostgreSQL is running. For cloud DBs, add `?sslmode=require` if needed.
- **"Database does not exist"** – Create the database first (e.g. `createdb pharma_dms` or via your provider’s UI).
- **"Schema drift" / "Migration failed"** – Do not edit migration SQL by hand unless you know what you’re doing. Prefer fixing `schema.prisma` and creating a new migration.

## 4. Later: add more migrations

After changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

For production, apply existing migrations without prompting:

```bash
npx prisma migrate deploy
```

## 5. Optional: reset database (dev only)

Wipes the database and reapplies all migrations from scratch:

```bash
npx prisma migrate reset
```

**Warning:** Deletes all data. Use only in development.

---

## 6. Seed dummy data (verify scenarios)

To insert demo users, roles, departments, and permissions:

```bash
npm run seed
```

This creates:

- **1 organization** – Pharma DMS Demo
- **4 departments** – QA, REG, DOC, OPS
- **8 roles** – admin, requestor, manager_reviewer, manager_approver, reviewer, approver, preparator, manager
- **Sample permissions** – user.manage, request.view, request.approve, etc. (admin has all)
- **4 demo users** (password for all: **demo123**):

| Email                      | Role            | Use for              |
|---------------------------|-----------------|----------------------|
| sarah.admin@company.com   | admin           | Full access          |
| john.requestor@company.com| requestor       | Preparator flow      |
| robert.manager@company.com| manager_reviewer| Reviewer flow        |
| patricia.approver@company.com | approver   | Approver flow        |

After seeding, you can call `POST /api/auth/login` with e.g. `{"email":"sarah.admin@company.com","password":"demo123"}` to get tokens and test the API.
