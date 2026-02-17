# Postman Collection Guide – Phase 1 (All Completed APIs)

This guide explains how to use the **single** Postman collection for all Phase 1 APIs.

## Collection File

**File:** `Pharma-DMS-Phase1-All-APIs.postman_collection.json`

This is the only collection file. It includes:
- **1.1** Authentication & Identity
- **1.2** Dashboards & Navigation
- **1.3** Templates & AI-Assisted Document Preparation (AWS S3)

## Importing the Collection

1. Open Postman
2. Click **Import** (top left)
3. Select **File**
4. Choose `Pharma-DMS-Phase1-All-APIs.postman_collection.json`
5. Click **Import**

## Collection Structure

### 1. Health Check
- Health Check – Verify backend is running

### 2. Authentication (1.1)
- Login, Refresh Token, Logout, Forgot Password, Reset Password

### 3. Identity (1.1)
- Get Current User (Me), List Roles, List Departments, Get Navigation

### 4. Dashboard (1.2)
- Get Request Counts, Get Recent Requests, Get Recent Templates, Get KPIs

### 5. Templates (1.3)
- **1. Upload Template** – Multipart file upload (Word/Excel/PDF, max 50MB)
- **2. List Templates** – Get All Templates, Get Templates by Status
- **3. Get Template Details** – By ID, with optional download URL
- **4. Download & Preview** – Presigned S3 URL
- **5. Update Template** – Metadata, form schema, AI workflow
- **6. Approve Template**
- **7. Template Versions**
- **8. Delete Template** – Soft delete

## Collection Variables

- **`baseUrl`** – Backend URL (default: `http://localhost:4000`)
- **`accessToken`** – JWT (auto-saved from Login)
- **`refreshToken`** – JWT (auto-saved from Login)
- **`templateId`** – Auto-set after Upload Template

## Usage Workflow

1. **Health Check** → confirm server is up
2. **Login** → use demo user (e.g. `sarah.admin@company.com` / `demo123`); tokens are saved automatically
3. **Identity / Dashboard / Templates** → all use `{{accessToken}}`; for Templates, upload first to set `{{templateId}}`

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| sarah.admin@company.com | demo123 | Admin |
| john.requestor@company.com | demo123 | Requestor |
| robert.manager@company.com | demo123 | Manager |
| patricia.approver@company.com | demo123 | Approver |

## Phase 1.3 Template Upload

- **Body:** form-data, field name `file` (type: File)
- **Allowed types:** .docx, .xlsx, .pdf (max 50MB)
- **Optional fields:** name, description, departmentId, organizationId
- Files are stored in AWS S3; download via **Get Presigned Download URL**

## Troubleshooting

- **accessToken not set** – Run Login first
- **401** – Run Refresh Token or Login again
- **503** – Run `npx prisma db push`
- **Connection refused** – Start backend with `npm run dev`, check `baseUrl`
