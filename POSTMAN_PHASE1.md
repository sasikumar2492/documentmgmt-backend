# Phase 1 APIs – Postman verification

**Base URL:** `http://localhost:4000` (or your `PORT` from `.env`)

All Phase 1 routes are under **`/api`**.

---

## 1. Health (no auth)

| Method | URL | Body | Notes |
|--------|-----|------|--------|
| GET | `{{baseUrl}}/health` | — | Expect `200` and `{ "status": "ok", "service": "documentmgmt-backend" }` |

---

## 2. Auth APIs (no auth)

### 2.1 Login

**Request**
- **Method:** POST  
- **URL:** `{{baseUrl}}/api/auth/login`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
```json
{
  "email": "sarah.admin@company.com",
  "password": "demo123"
}
```
Optional: `"context": "DMS"` or `"context": "TicketFlow"` to tag the session.

**Success (200)**
- `user`: `{ id, email, fullName, roles[], departments: [{ id, name }], orgId }`
- `tokens`: `{ accessToken, refreshToken }`

**Use:** Copy `accessToken` for the Identity requests below. Copy `refreshToken` for the Refresh request.

---

### 2.2 Refresh token

**Request**
- **Method:** POST  
- **URL:** `{{baseUrl}}/api/auth/refresh`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
```json
{
  "refreshToken": "<paste_refresh_token_from_login>"
}
```

**Success (200)**  
- `tokens`: `{ accessToken, refreshToken }`

---

### 2.3 Forgot password

**Request**
- **Method:** POST  
- **URL:** `{{baseUrl}}/api/auth/forgot-password`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
```json
{
  "email": "sarah.admin@company.com"
}
```

**Success (200)**  
- `{ "message": "If the email exists, a reset link has been sent." }`  
- In Phase 1 the reset token is logged in the **backend console**, not sent by email.

---

### 2.4 Reset password

Use the token printed in the backend console after “Forgot password” (or from your reset flow).

**Request**
- **Method:** POST  
- **URL:** `{{baseUrl}}/api/auth/reset-password`  
- **Headers:** `Content-Type: application/json`  
- **Body (raw JSON):**
```json
{
  "token": "<reset_token_from_console>",
  "newPassword": "newSecurePassword123"
}
```

**Success (200)**  
- `{ "message": "Password has been reset successfully." }`  
- After this, use `newPassword` to login.

---

## 3. Identity APIs (auth required)

Use the **access token** from Login (or Refresh) in the header:

**Header:** `Authorization: Bearer <access_token>`

### 3.1 Current user (me)

- **Method:** GET  
- **URL:** `{{baseUrl}}/api/identity/me`  
- **Headers:** `Authorization: Bearer <access_token>`

**Success (200)**  
- `{ id, email, fullName, roles[], departments: [{ id, name }], orgId }`

---

### 3.2 List roles

- **Method:** GET  
- **URL:** `{{baseUrl}}/api/identity/roles`  
- **Headers:** `Authorization: Bearer <access_token>`

**Success (200)**  
- Array of `{ id, name, description, isSystem, ... }`

---

### 3.3 List departments

- **Method:** GET  
- **URL:** `{{baseUrl}}/api/identity/departments`  
- **Headers:** `Authorization: Bearer <access_token>`

**Success (200)**  
- Array of `{ id, name, code, isActive, ... }`

---

## Quick checklist

1. **Health** – GET `/health` → 200  
2. **Login** – POST `/api/auth/login` with `sarah.admin@company.com` / `demo123` → 200, copy `accessToken`  
3. **Me** – GET `/api/identity/me` with `Authorization: Bearer <access_token>` → 200  
4. **Roles** – GET `/api/identity/roles` with same header → 200  
5. **Departments** – GET `/api/identity/departments` with same header → 200  
6. **Refresh** – POST `/api/auth/refresh` with `refreshToken` from step 2 → 200  
7. **Forgot password** – POST `/api/auth/forgot-password` with email → 200, check backend console for token  
8. **Reset password** – POST `/api/auth/reset-password` with that token + new password → 200  

---

## Postman variables (optional)

- **baseUrl:** `http://localhost:4000`  
- **accessToken:** (set from Login response, use in Identity requests)  
- **refreshToken:** (set from Login response, use in Refresh request)

Error responses use shape: `{ "error": { "code": "...", "message": "..." } }` with status 400/401/404/500 as appropriate.
