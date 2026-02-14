# Fix: "The column User.passwordHash does not exist"

Your database does not have the Phase 1 schema (the migration was not applied to this DB, or the DB has old/different tables).

## Do this once (in a terminal)

**1. Stop the backend**  
Stop `npm run dev` (Ctrl+C in the terminal where it’s running).

**2. Reset the database and re-seed**

```bash
cd d:\Lamp Projects\DMS\Pharma-DMS\documentmgmt-backend
npm run db:reset
```

When Prisma asks: **Do you want to continue? All data will be lost.** → type **y** and press Enter.

**3. Start the backend again**

```bash
npm run dev
```

**4. Try login again**  
POST `/api/auth/login` with `sarah.admin@company.com` / `demo123`.

---

**Warning:** `npm run db:reset` deletes all data in the database and recreates tables. Use only on a development database.
