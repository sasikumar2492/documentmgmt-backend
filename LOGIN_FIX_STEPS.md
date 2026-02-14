# Fix login (POST /api/auth/login) – do these in order

## 1. Stop the backend

In the terminal where `npm run dev` is running, press **Ctrl+C**.

## 2. Regenerate Prisma client

```bash
cd d:\Lamp Projects\DMS\Pharma-DMS\documentmgmt-backend
npx prisma generate
```

## 3. Ensure demo user passwords are set

```bash
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npm run db:insert-demo-users
```

(On CMD use: `set NODE_TLS_REJECT_UNAUTHORIZED=0` then `npm run db:insert-demo-users`)

## 4. Start the backend again

```bash
npm run dev
```

## 5. Test in Postman

- **Method:** POST  
- **URL:** `http://localhost:4000/api/auth/login`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
```json
{
  "email": "sarah.admin@company.com",
  "password": "demo123"
}
```

You should get **200** with `user` and `tokens` in the response.

---

**If you still get an error:** note the exact message (e.g. "column X does not exist" or "Invalid email or password"). The login flow now uses a minimal user query and no longer depends on UserRole/UserDepartment for a successful login.
