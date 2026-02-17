# Database Connection Troubleshooting (P1001)

**Error:** `PrismaClientInitializationError: Can't reach database server at ...`  
**Code:** `P1001`

Your app cannot reach the PostgreSQL server. Use the steps below to fix it.

---

## 1. Aiven database is paused (very common)

Aiven free-tier or inactive databases are **paused** after some time.

**Fix:**
1. Log in to [Aiven Console](https://console.aiven.io/)
2. Open your project and select the PostgreSQL service
3. If you see **Paused** or **Stopped**, click **Start** / **Resume**
4. Wait 1–2 minutes, then run `npm run dev` again

---

## 2. Check network / firewall

- Confirm you’re on the internet and not blocked by a firewall.
- Try from another network (e.g. mobile hotspot) to rule out corporate VPN/firewall.
- From PowerShell, test reachability (replace with your host/port from `.env`):
  ```powershell
  Test-NetConnection -ComputerName pg-19abc286-prabaisabella92-f6f7.d.aivencloud.com -Port 10525
  ```
  If it fails, the host/port is not reachable from your machine.

---

## 3. Verify `DATABASE_URL` in `.env`

- Open `.env` and confirm `DATABASE_URL` has:
  - Correct host, port, user, password, database name
  - `?sslmode=require` at the end (Aiven needs SSL)
- Example shape (no real credentials):
  ```env
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
  ```
- If you changed the password in Aiven, update it in `.env`.
- Get the latest connection string from Aiven: Service → **Overview** → **Connection information**.

---

## 4. Run Prisma against the DB

From the backend folder:

```bash
npx prisma db pull
```

- If this also fails with P1001, the problem is connectivity or `.env`, not your app code.
- If it works, the DB is reachable; then run `npm run dev` again.

---

## 5. Use a local PostgreSQL (optional)

If you can’t use Aiven (e.g. no internet to Aiven, or you prefer local):

1. Install PostgreSQL and create a database.
2. In `.env` set:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/your_db_name?sslmode=disable"
   ```
3. Run:
   ```bash
   npx prisma db push
   npm run seed
   npm run dev
   ```

---

## Quick checklist

- [ ] Aiven service is **Running** (not Paused/Stopped)
- [ ] `DATABASE_URL` in `.env` is correct and has `?sslmode=require`
- [ ] No firewall/VPN blocking the Aiven host/port
- [ ] You can open Aiven Console in the browser (same network)

Most P1001 errors are resolved by **starting/resuming the database in the Aiven Console**.
