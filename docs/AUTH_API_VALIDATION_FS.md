# Auth APIs validation vs customer FS (1.Administrator FS.docx)

This document maps the **Functional Specification for Administration Module** (Administrator FS) to the Phase 1 auth APIs and lists what can be validated now and what is deferred.

---

## Source document summary

- **Document:** 1.Administrator FS.docx (Functional Specification – Administration Module)
- **Relevant sections:** Policy Settings, User Registration, Password Request and User Account Unlock, Login-related behaviour.

---

## 1. Login (POST /api/auth/login)

| FS / Doc requirement | Our API behaviour | Validate in Phase 1? |
|----------------------|-------------------|----------------------|
| User signs in with credentials (doc: User ID + password; we use **email** + password) | `POST /api/auth/login` with `email`, `password` → returns `user` + `tokens` | ✅ Yes |
| Authorized user can access; unauthorized cannot | 200 + user/tokens for valid credentials; 401 for invalid | ✅ Yes |
| Invalid credentials handling | Doc: “wrong password” → count invalid attempts; after N attempts → **account locked**. We: return 401, no lock yet | ⚠️ Partial – we validate 401; **account lock after N wrong attempts** is **not implemented** (deferred) |
| Session / idle timeout (doc: “Idle Time after Login”, “session will expire”, “log in again”) | We use JWT access token (short-lived) + refresh token; no server-side “idle timeout” from policy yet | ⚠️ Partial – token expiry aligns with “session”; **policy-driven session timeout** is **deferred** |

**Validation checklist (Postman / tests)**

- [ ] **Valid credentials** – Body: `{ "email": "sarah.admin@company.com", "password": "demo123" }` → **200**, response has `user` (id, email, fullName, roles, departments) and `tokens` (accessToken, refreshToken).
- [ ] **Invalid email** – Body: `{ "email": "unknown@company.com", "password": "demo123" }` → **401**, error code/message for invalid credentials.
- [ ] **Invalid password** – Body: `{ "email": "sarah.admin@company.com", "password": "wrong" }` → **401**.
- [ ] **Inactive user** – If a user is deactivated (`isActive: false`), login → **401**.

---

## 2. Refresh token (POST /api/auth/refresh)

| FS / Doc requirement | Our API behaviour | Validate in Phase 1? |
|----------------------|-------------------|----------------------|
| User can continue session without re-entering password (doc: “log in again” after timeout) | `POST /api/auth/refresh` with `refreshToken` → new access + refresh tokens | ✅ Yes |

**Validation checklist**

- [ ] **Valid refresh token** – Body: `{ "refreshToken": "<from_login>" }` → **200**, response has `tokens` (accessToken, refreshToken).
- [ ] **Invalid/expired refresh token** – → **401** (or 400).

---

## 3. Forgot password (POST /api/auth/forgot-password)

| FS / Doc requirement | Our API behaviour | Validate in Phase 1? |
|----------------------|-------------------|----------------------|
| User initiates “Forgot password” (doc: enter User ID → select Forgot password) | We use **email** instead of User ID. `POST /api/auth/forgot-password` with `email` | ✅ Yes |
| System does not reveal whether account exists (doc: “indication message confirming the availability of the user ID”) | We return same generic message whether email exists or not | ✅ Yes |
| Doc: security questions (3) → self-service password change OR send request to administrator | We use **token-based reset link** (no security questions, no admin approval in Phase 1) | ⚠️ **Gap** – security questions and admin approval flow are **out of Phase 1 scope** |

**Validation checklist**

- [ ] **Valid email** – Body: `{ "email": "sarah.admin@company.com" }` → **200**, generic message; reset token created (check backend console in Phase 1).
- [ ] **Unknown email** – Body: `{ "email": "nonexistent@company.com" }` → **200**, same generic message (no information leak).

---

## 4. Reset password (POST /api/auth/reset-password)

| FS / Doc requirement | Our API behaviour | Validate in Phase 1? |
|----------------------|-------------------|----------------------|
| User can set new password (doc: after security questions or after admin approval + OTP) | We use **single-use token** (from forgot-password) + `newPassword` | ✅ Yes |
| Doc: “password will be reset and sent one-time password to approver mail” | We reset password; **email with OTP to approver** is not implemented in Phase 1 (only token logged to console) | ⚠️ **Gap** – email/OTP to approver is **deferred** |

**Validation checklist**

- [ ] **Valid token + new password** – Body: `{ "token": "<from_console_after_forgot>", "newPassword": "NewSecure123" }` → **200**; then login with new password succeeds.
- [ ] **Invalid/expired token** – → **400** (or 422), clear error.
- [ ] **Token already used** – Second request with same token → **400**.

---

## 5. Identity / authorized access (GET /api/identity/me, /roles, /departments)

| FS / Doc requirement | Our API behaviour | Validate in Phase 1? |
|----------------------|-------------------|----------------------|
| Authorized user can view their profile / role / department (doc: “authorized user who has the respective privilege”) | `GET /api/identity/me`, `/roles`, `/departments` with `Authorization: Bearer <accessToken>` | ✅ Yes |
| Unauthorized cannot view (doc: “will not allow Unauthorized to view”) | Missing or invalid token → **401** | ✅ Yes |

**Validation checklist**

- [ ] **With valid access token** – GET `/api/identity/me` → **200**, user object with roles and departments; GET `/api/identity/roles` and `/api/identity/departments` → **200**, lists.
- [ ] **Without token** – GET `/api/identity/me` without `Authorization` → **401**.
- [ ] **Invalid/expired token** – → **401**.

---

## 6. Not in Phase 1 scope (from FS doc)

These are in the Administrator FS but **not implemented** in Phase 1; they are deferred for later phases:

| FS item | Description | Phase 1 status |
|--------|--------------|----------------|
| **Policy Settings (FS-ADM-01)** | User ID min/max, Username min/max, Password expiry (days), No of wrong attempts (lock), Password length, Password reusability, Password complexity, Session timeout (minutes) | ❌ No API; deferred (admin/settings) |
| **Account lock after N wrong attempts** | “User account will be automatically locked … if the user fails to provide the correct password for a specified number of consecutive attempts in Login Page” | ❌ Not implemented; deferred |
| **Security questions for Forgot password / Unlock** | “Security questions that were set up during the sign-in process”; “provide all three correct answers” | ❌ Not implemented; deferred |
| **Admin approval for Forgot password / User account unlock** | Request to administrator; approval workflow; “OTP will send to the approver” | ❌ Not implemented; deferred |
| **User Registration (CRUD + workflow)** | User ID, Username, Email, Role, Department, Plant, workflow, OTP to initiator/reviewer/approver | ❌ Only seed data; optional register API in plan; full workflow deferred |
| **Password Request list (admin)** | “Password request form … password request list”; approve → OTP to approver | ❌ Deferred |
| **User account unlock list (admin)** | Unlock request list; approve → unlock | ❌ Deferred |
| **Single session / “not allow same to login in two different systems”** | Doc: “Application will not allow same to login in two different systems” | ❌ Not implemented; deferred (session management) |

---

## 7. Summary: what to validate now

Use **Postman** (or automated tests) to verify:

1. **Login** – Valid credentials → 200 + user + tokens; invalid → 401.
2. **Refresh** – Valid refresh token → 200 + new tokens; invalid → 401.
3. **Forgot password** – Any email → 200 + same message; token in backend console for known email.
4. **Reset password** – Valid token + newPassword → 200; then login with new password works; invalid/used token → 4xx.
5. **Identity** – With Bearer token → 200 for /me, /roles, /departments; without/invalid token → 401.

This gives you a **validation report** that the Phase 1 auth APIs behave as above; gaps vs the full FS (policy settings, security questions, admin approval, account lock, single session) are documented for later phases.
