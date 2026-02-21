# Pharma-DMS Backend API Documentation

Complete API documentation for all Phase 1 completed APIs (1.1 Authentication & Identity, 1.2 Dashboards & Navigation, 1.3 Templates & AI-Assisted Document Preparation).

**Base URL:** `http://localhost:4000` (or your `PORT` from `.env`)  
**API Prefix:** `/api`

---

## Table of Contents

1. [Authentication & Access (1.1)](#1-authentication--access-11)
2. [Identity (1.1)](#2-identity-11)
3. [Dashboards & Navigation (1.2)](#3-dashboards--navigation-12)
4. [Templates & AI-Assisted Document Preparation (1.3)](#4-templates--ai-assisted-document-preparation-13)
5. [Error Responses](#error-responses)
6. [Authentication](#authentication)
7. [API Endpoints Quick Reference](#api-endpoints-quick-reference)

---

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Forgot password |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/identity/me` | Current user |
| GET | `/api/identity/roles` | List roles |
| GET | `/api/identity/departments` | List departments |
| GET | `/api/identity/navigation` | Navigation (allowed routes) |
| GET | `/api/dashboard/request-counts` | Request counts |
| GET | `/api/dashboard/recent-requests` | Recent requests |
| GET | `/api/dashboard/recent-templates` | Recent templates |
| GET | `/api/dashboard/kpis` | KPIs |
| POST | `/api/templates/upload` | Upload template (multipart) |
| GET | `/api/templates` | List templates (paginated) |
| GET | `/api/templates/:id` | Get template by ID (`?includeDownloadUrl`, `?includeHtml`) |
| GET | `/api/templates/:id/html` | Get template HTML only (editable view) |
| POST | `/api/templates/:id/save-content` | Merge HTML into original DOCX (or convert only), upload to S3 (body: `{ "html": "..." }`) |
| GET | `/api/templates/:id/download` | Presigned download URL (`?expiresIn`) |
| GET | `/api/templates/:id/preview` | Alias for download |
| PATCH | `/api/templates/:id` | Update template metadata |
| POST | `/api/templates/:id/approve` | Approve template |
| GET | `/api/templates/:id/versions` | Get template versions (`?includeDownloadUrls`) |
| DELETE | `/api/templates/:id` | Soft delete (`?deleteS3File`) |

---

## 1. Authentication & Access (1.1)

### 1.1 Health Check

**Endpoint:** `GET /health`  
**Authentication:** Not required

**Response (200):**
```json
{
  "status": "ok",
  "service": "documentmgmt-backend"
}
```

---

### 1.2 Login

**Endpoint:** `POST /api/auth/login`  
**Authentication:** Not required

**Request Body:**
```json
{
  "email": "sarah.admin@company.com",
  "password": "demo123",
  "context": "DMS"
}
```

**Fields:**
- `email` (string, required) - User email address
- `password` (string, required) - User password
- `context` (string, optional) - Session context: `"DMS"` or `"TicketFlow"`

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "sarah.admin@company.com",
    "fullName": "Sarah Johnson",
    "roles": ["admin"],
    "departments": [
      {
        "id": "dept-id",
        "name": "Quality Assurance"
      }
    ],
    "orgId": "org-id"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `400` - Missing required fields

**Demo Users:**
- `sarah.admin@company.com` / `demo123` (Admin)
- `john.requestor@company.com` / `demo123` (Requestor)
- `robert.manager@company.com` / `demo123` (Manager)
- `patricia.approver@company.com` / `demo123` (Approver)

---

### 1.3 Refresh Token

**Endpoint:** `POST /api/auth/refresh`  
**Authentication:** Not required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401` - Invalid or expired refresh token

---

### 1.4 Logout

**Endpoint:** `POST /api/auth/logout`  
**Authentication:** Not required (but recommended to send refreshToken)

**Request Body (optional):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully. Client should discard tokens."
}
```

**Note:** Client should discard tokens after logout. Body is optional; if provided, refreshToken can be used for server-side revocation (future enhancement).

---

### 1.5 Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`  
**Authentication:** Not required

**Request Body:**
```json
{
  "email": "sarah.admin@company.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

**Note:** In Phase 1, the reset token is logged in the **backend console** (not sent by email).  
**To get reset token:** Check backend console output or run: `npm run get-reset-token <email>`

---

### 1.6 Reset Password

**Endpoint:** `POST /api/auth/reset-password`  
**Authentication:** Not required

**Request Body:**
```json
{
  "token": "<reset_token_from_backend_console>",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully."
}
```

**Error Responses:**
- `400` - Invalid or expired token
- `400` - Token already used

**Note:** After reset, use the new password to login.

---

## 2. Identity (1.1)

All identity endpoints require authentication. Include the access token in the header:

**Header:** `Authorization: Bearer <accessToken>`

---

### 2.1 Get Current User (Me)

**Endpoint:** `GET /api/identity/me`  
**Authentication:** Required

**Response (200):**
```json
{
  "id": "user-id",
  "email": "sarah.admin@company.com",
  "fullName": "Sarah Johnson",
  "roles": ["admin"],
  "departments": [
    {
      "id": "dept-id",
      "name": "Quality Assurance"
    }
  ],
  "orgId": "org-id"
}
```

---

### 2.2 List Roles

**Endpoint:** `GET /api/identity/roles`  
**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "role-id",
    "name": "admin",
    "description": "Administrator role",
    "isSystem": true,
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-02-14T10:00:00.000Z"
  }
]
```

---

### 2.3 List Departments

**Endpoint:** `GET /api/identity/departments`  
**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "dept-id",
    "name": "Quality Assurance",
    "code": "QA",
    "isActive": true,
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-02-14T10:00:00.000Z"
  }
]
```

---

### 2.4 Get Navigation

**Endpoint:** `GET /api/identity/navigation`  
**Authentication:** Required

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
  "permissions": [
    "request.view",
    "request.create",
    "template.manage",
    "audit.view"
  ],
  "roles": ["admin"],
  "isAdmin": true
}
```

**Fields:**
- `allowedRouteIds` - List of view/route IDs the user can access (matches sidebar item IDs)
- `permissions` - List of permission keys from user's roles
- `roles` - User's role names
- `isAdmin` - Convenience flag for admin-only sections

---

## 3. Dashboards & Navigation (1.2)

All dashboard endpoints require authentication.

---

### 3.1 Get Request Counts

**Endpoint:** `GET /api/dashboard/request-counts`  
**Authentication:** Required

**Query Parameters:**
- `range` (string, optional) - Time range: `7d`, `30d`, or `90d` (default: `30d`)
- `groupBy` (string, optional) - Group by: `status`, `department`, or `role` (default: `status`)

**Example:** `GET /api/dashboard/request-counts?range=30d&groupBy=status`

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
    {
      "departmentId": "dept-id",
      "departmentCode": "QA",
      "departmentName": "Quality Assurance",
      "pending": 2,
      "approved": 6,
      "rejected": 1
    }
  ],
  "byRole": [
    {
      "roleId": "role-id",
      "roleName": "requestor",
      "pending": 3,
      "approved": 5
    }
  ]
}
```

**Note:** Currently returns stub data in Phase 1 (no Request entities yet).

---

### 3.2 Get Recent Requests

**Endpoint:** `GET /api/dashboard/recent-requests`  
**Authentication:** Required

**Query Parameters:**
- `limit` (number, optional) - Number of items (default: 10, max: 50)
- `range` (string, optional) - Time range: `7d`, `30d`, or `90d` (default: `30d`)

**Example:** `GET /api/dashboard/recent-requests?limit=10&range=30d`

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

**Note:** Currently returns stub data in Phase 1 (no Request entities yet).

---

### 3.3 Get Recent Templates

**Endpoint:** `GET /api/dashboard/recent-templates`  
**Authentication:** Required

**Query Parameters:**
- `limit` (number, optional) - Number of items (default: 10, max: 50)
- `range` (string, optional) - Time range: `7d`, `30d`, or `90d` (default: `30d`)

**Example:** `GET /api/dashboard/recent-templates?limit=10&range=30d`

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

**Note:** Currently returns stub data in Phase 1 (no Template entities yet).

---

### 3.4 Get KPIs

**Endpoint:** `GET /api/dashboard/kpis`  
**Authentication:** Required

**Query Parameters:**
- `range` (string, optional) - Time range: `7d`, `30d`, or `90d` (default: `30d`)

**Example:** `GET /api/dashboard/kpis?range=30d`

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

**Note:** Currently returns stub data except `totalUsers` and `totalDepartments` (from database) in Phase 1.

---

## 4. Templates & AI-Assisted Document Preparation (1.3)

All template endpoints require authentication. **AWS S3** is used for the final .doc/.docx file after the user saves edited HTML (see flow below). **ConvertAPI** and **Google Gemini** are used for .doc/.docx → PDF → HTML and HTML → .docx.

**1.3 Flow (for .doc/.docx):**
1. **Upload** (.doc/.docx) → stored in local DB and on disk.
2. Backend converts to **PDF** (ConvertAPI), then to **HTML** (Gemini).
3. **GET /templates/:id** or **GET /templates/:id/html** returns HTML for the frontend editable view.
4. User edits HTML on the frontend; **POST /templates/:id/save-content** sends edited HTML.
5. Backend reconverts HTML   .docx (ConvertAPI, with local **html-to-docx** fallback if ConvertAPI is unavailable) and **uploads to S3**.
6. **GET /templates/:id/download** then returns a presigned URL for the .docx.

**S3 Configuration:**
- Bucket: `fedhub-demo-s3`
- Region: `ap-south-1`
- Base Path: `Pharma+DMS`
- File Structure: `Pharma+DMS/templates/{templateId}/v{version}/{filename}`

**Environment (optional for full 1.3 flow):**
- `CONVERT_API_SECRET` - ConvertAPI secret (doc PDF, HTML docx)
- `GEMINI_API_KEY` - Google Gemini API key (PDF HTML)
- `GEMINI_MODEL` - e.g. `gemini-2.5-flash` (default; use a model with free-tier quota)

---

### 4.1 Upload Template

**Endpoint:** `POST /api/templates/upload`  
**Authentication:** Required  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file, required) - Template file (.docx, .doc, .xlsx, .pdf, max 50MB)
- `name` (string, optional) - Display name for the template
- `description` (string, optional) - Template description
- `departmentId` (string, optional) - Department ID
- `organizationId` (string, optional) - Organization ID

**Supported File Types:**
- `.docx`, `.doc` - Microsoft Word (for .doc/.docx: stored locally, converted to PDF then HTML; no S3 until save-content)
- `.xlsx` - Microsoft Excel (uploaded directly to S3)
- `.pdf` - PDF documents (uploaded directly to S3)
- Legacy: `.xls`

**Max File Size:** 50MB

**Response (201) â€“ for .doc/.docx (with ConvertAPI + Gemini configured):**
```json
{
  "id": "template-id",
  "name": "Test Template",
  "originalFileName": "Approval_Form.docx",
  "fileSize": 245760,
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "version": 1,
  "status": "draft",
  "department": { "id": "dept-id", "name": "Quality Assurance", "code": "QA" },
  "organization": null,
  "createdAt": "2026-02-14T10:00:00.000Z",
  "updatedAt": "2026-02-14T10:00:00.000Z",
  "html": "<div>...</div>"
}
```
The `html` field is the generated HTML for the editable view (only for .doc/.docx when conversion succeeds).

**Response (201) â€“ for .xlsx/.pdf (direct S3 upload):**
Same shape as above but without `html`; file is in S3 immediately.

**Error Responses:**
- `400` - File required, invalid file type, or file too large
- `401` - Authentication required
- `502` / `503` - ConvertAPI or Gemini not configured or conversion failed (for .doc/.docx)
- `500` - S3 upload failed (for non-Word files)

---

### 4.2 List Templates

**Endpoint:** `GET /api/templates`  
**Authentication:** Required

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `pageSize` (number, optional) - Items per page (default: 10, max: 100)
- `departmentId` (string, optional) - Filter by department ID
- `status` (string, optional) - Filter by status: `draft`, `pending_approval`, `approved`, `deprecated`
- `organizationId` (string, optional) - Filter by organization ID
- `includeDeleted` (boolean, optional) - Include soft-deleted templates (default: false)

**Example:** `GET /api/templates?page=1&pageSize=10&status=draft`

**Response (200):**
```json
{
  "items": [
    {
      "id": "template-id",
      "name": "Test Template",
      "originalFileName": "Part_Approval_Form.xlsx",
      "fileSize": 245760,
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "version": 1,
      "status": "draft",
      "department": {
        "id": "dept-id",
        "name": "Quality Assurance",
        "code": "QA"
      },
      "organization": null,
      "createdAt": "2026-02-14T10:00:00.000Z",
      "updatedAt": "2026-02-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 4.3 Get Template by ID

**Endpoint:** `GET /api/templates/:id`  
**Authentication:** Required

**Query Parameters:**
- `includeDownloadUrl` (boolean, optional) - Include presigned download URL if template has an S3 file (default: false)
- `includeHtml` (boolean, optional) - Include generated HTML for editable view (for .doc/.docx templates; default: false)

**Example:** `GET /api/templates/{templateId}?includeDownloadUrl=true&includeHtml=true`

**Response (200):**
```json
{
  "id": "template-id",
  "name": "Test Template",
  "description": "Template description",
  "originalFileName": "Part_Approval_Form.xlsx",
  "fileSize": 245760,
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "version": 1,
  "status": "draft",
  "parsedSections": {
    "sections": []
  },
  "formSchema": {
    "fields": []
  },
  "aiWorkflowProposal": {
    "steps": []
  },
  "department": {
    "id": "dept-id",
    "name": "Quality Assurance",
    "code": "QA"
  },
  "organization": null,
  "createdBy": {
    "id": "user-id",
    "email": "sarah.admin@company.com",
    "fullName": "Sarah Johnson"
  },
  "createdAt": "2026-02-14T10:00:00.000Z",
  "updatedAt": "2026-02-14T10:00:00.000Z",
  "downloadUrl": "https://fedhub-demo-s3.s3.ap-south-1.amazonaws.com/...",
  "downloadUrlExpiresAt": "2026-02-14T11:00:00.000Z"
}
```

**Note:** `downloadUrl` and `downloadUrlExpiresAt` are only included if `includeDownloadUrl=true` and the template has a file in S3 (for .doc/.docx, only after **save-content**). `html` is only included if `includeHtml=true` and the template has generated HTML.

**Error Responses:**
- `404` - Template not found

---

### 4.3a Get Template HTML (editable view)

**Endpoint:** `GET /api/templates/:id/html`  
**Authentication:** Required

Returns only the HTML body (Content-Type: text/html) for the template. Use this for the frontend editable HTML editor. For .doc/.docx templates, HTML is generated during upload (ConvertAPI → Gemini).

**Response (200):** Raw HTML string (e.g. `<div>...</div>`).

**Error Responses:**
- `404` - Template not found or HTML not yet generated (e.g. upload a .doc/.docx first).

---

### 4.3b Save Template Content (merge HTML into original DOCX, upload to S3)

**Endpoint:** `POST /api/templates/:id/save-content`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "html": "<div>Edited HTML content...</div>"
}
```

Receives the modified HTML and produces an updated DOC file that preserves the original document's alignment and design:

1. **Locate original document:** If the template has a stored original file (`.docx`) at `localFilePath`, the backend reads it from disk.
2. **Merge content:** The updated HTML is converted to DOCX (ConvertAPI or local `html-to-docx`), then the **body content** of that DOCX is merged into the **original** DOCX. The original provides styles, section properties (margins, page size), and layout; the new content replaces only the main body. Result: alignment and design match the original file.
3. **No original .docx:** If there is no local `.docx` (e.g. template was `.doc` only, or file is missing), the backend converts HTML to DOCX only and uploads that.
4. **Upload:** The resulting DOCX is uploaded to the specified S3 bucket.

No frontend changes are required; the frontend continues to POST `{ "html": "..." }` and receives the updated template.

**Response (200):**
```json
{
  "status": "success",
  "s3Key": "Pharma+DMS/templates/{templateId}/v1/document.docx",
  "updatedAt": "2026-02-21T10:00:00.000Z",
  "id": "template-id",
  "name": "Test Template",
  "originalFileName": "document.docx",
  "templateStatus": "draft",
  "html": "<div>...</div>",
  "fileSize": 245760,
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "version": 1,
  "department": null,
  "organization": null,
  "createdAt": "2026-02-21T09:00:00.000Z"
}
```
Use `status`, `s3Key`, and `updatedAt` to confirm success; use full object to refresh UI.

**Error Responses:**
- `400` - Missing or empty `html`
- `401` - Authentication required
- `404` - Template not found
- `502` - ConvertAPI HTML to docx, DOCX merge (invalid/missing body), or S3 upload failed
- `503` - ConvertAPI not configured (when no local html-to-docx fallback)

---

### 4.4 Get Presigned Download URL

**Endpoint:** `GET /api/templates/:id/download` or `GET /api/templates/:id/preview`  
**Authentication:** Required

**Query Parameters:**
- `expiresIn` (number, optional) - URL expiration time in seconds (default: 3600 = 1 hour)

**Example:** `GET /api/templates/{templateId}/download?expiresIn=3600`

**Response (200):**
```json
{
  "downloadUrl": "https://fedhub-demo-s3.s3.ap-south-1.amazonaws.com/Pharma+DMS/templates/{templateId}/v1/{filename}?X-Amz-Algorithm=...",
  "expiresAt": "2026-02-14T11:00:00.000Z"
}
```

**Note:** For .doc/.docx templates, the document file is only in S3 after the user has saved edited HTML via **POST /api/templates/:id/save-content**. Until then, this endpoint returns `400 DOCUMENT_NOT_SAVED`. Use the presigned URL in browser or download tool; URLs expire after the specified time (default: 1 hour).

**Error Responses:**
- `400` - Document not saved yet (save edited HTML first for .doc/.docx)
- `404` - Template not found
- `500` - Failed to generate presigned URL

---

### 4.5 Update Template Metadata

**Endpoint:** `PATCH /api/templates/:id`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body (all fields optional):**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "parsedSections": {
    "sections": [
      {
        "name": "Section 1",
        "fields": []
      }
    ]
  },
  "formSchema": {
    "fields": []
  },
  "aiWorkflowProposal": {
    "steps": []
  },
  "status": "pending_approval"
}
```

**Status Values:**
- `draft` - Template is being prepared
- `pending_approval` - Awaiting approval
- `approved` - Template is approved and ready for use
- `deprecated` - Template is deprecated

**Response (200):**
```json
{
  "id": "template-id",
  "name": "Updated Template Name",
  "description": "Updated description",
  "version": 1,
  "status": "pending_approval",
  "parsedSections": { ... },
  "formSchema": { ... },
  "aiWorkflowProposal": { ... },
  "department": { ... },
  "updatedAt": "2026-02-14T12:00:00.000Z"
}
```

**Note:** File updates require creating a new version. This endpoint only updates metadata.

**Error Responses:**
- `404` - Template not found
- `400` - Invalid status transition

---

### 4.6 Approve Template

**Endpoint:** `POST /api/templates/:id/approve`  
**Authentication:** Required

**Response (200):**
```json
{
  "id": "template-id",
  "name": "Test Template",
  "status": "approved",
  "version": 1,
  "updatedAt": "2026-02-14T12:00:00.000Z"
}
```

**Error Responses:**
- `404` - Template not found
- `400` - Template is already approved

**Note:** Only templates in `draft` or `pending_approval` status can be approved.

---

### 4.7 Get Template Versions

**Endpoint:** `GET /api/templates/:id/versions`  
**Authentication:** Required

**Query Parameters:**
- `includeDownloadUrls` (boolean, optional) - Include presigned download URLs for each version (default: false)

**Example:** `GET /api/templates/{templateId}/versions?includeDownloadUrls=true`

**Response (200):**
```json
{
  "versions": [
    {
      "id": "template-id-v1",
      "version": 1,
      "status": "approved",
      "fileSize": 245760,
      "createdAt": "2026-02-14T10:00:00.000Z",
      "downloadUrl": "https://fedhub-demo-s3.s3.ap-south-1.amazonaws.com/...",
      "downloadUrlExpiresAt": "2026-02-14T11:00:00.000Z"
    },
    {
      "id": "template-id-v2",
      "version": 2,
      "status": "draft",
      "fileSize": 250000,
      "createdAt": "2026-02-15T10:00:00.000Z"
    }
  ]
}
```

**Note:** Versions are ordered by version number (descending). Download URLs are only included if `includeDownloadUrls=true`.

**Error Responses:**
- `404` - Template not found

---

### 4.8 Delete Template

**Endpoint:** `DELETE /api/templates/:id`  
**Authentication:** Required

**Query Parameters:**
- `deleteS3File` (boolean, optional) - Also delete file from S3 (default: false, keeps file for audit)

**Example:** `DELETE /api/templates/{templateId}?deleteS3File=false`

**Response (200):**
```json
{
  "message": "Template deleted successfully"
}
```

**Note:** This is a **soft delete** - the template record is marked as deleted but can be recovered if needed. The S3 file is kept by default for audit trail.

**Error Responses:**
- `404` - Template not found

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created (for POST requests that create resources)
- `400` - Bad Request (validation errors, invalid input)
- `401` - Unauthorized (missing or invalid authentication token)
- `403` - Forbidden (authenticated but insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error
- `503` - Service Unavailable (e.g., database connection issues)

### Common Error Codes

- `UNAUTHENTICATED` - Missing or invalid authentication token
- `USER_NOT_FOUND` - User not found
- `TEMPLATE_NOT_FOUND` - Template not found
- `HTML_REQUIRED` - Request body must include non-empty `html` (save-content)
- `DOCUMENT_NOT_SAVED` - .doc/.docx file not yet in S3 (call save-content first before download)
- `DOCX_MERGE_INVALID_ZIP` - Original or new DOCX is not a valid ZIP (save-content merge)
- `DOCX_MERGE_MISSING_DOCUMENT` - DOCX missing word/document.xml (save-content merge)
- `DOCX_MERGE_INVALID_BODY` - Could not find w:body in document.xml (save-content merge)
- `FILE_REQUIRED` - File is required for upload
- `FILE_TOO_LARGE` - File exceeds maximum size (50MB)
- `INVALID_FILE_TYPE` - File type not allowed
- `S3_UPLOAD_FAILED` - Failed to upload file to S3
- `S3_PRESIGNED_URL_FAILED` - Failed to generate presigned URL
- `TEMPLATE_ALREADY_APPROVED` - Template is already approved

---

## Authentication

Most endpoints require authentication using **JWT (JSON Web Tokens)**.

### Getting an Access Token

1. Call `POST /api/auth/login` with valid credentials
2. Extract `accessToken` from the response
3. Include it in subsequent requests:

```
Authorization: Bearer <accessToken>
```

### Token Expiration

- **Access Token:** Expires in 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Refresh Token:** Expires in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)

### Refreshing Tokens

When the access token expires:
1. Call `POST /api/auth/refresh` with the `refreshToken`
2. Receive new `accessToken` and `refreshToken`
3. Use the new `accessToken` for subsequent requests

---

## Postman Collection

A complete Postman collection is available:
- **File:** `Pharma-DMS-Phase1-All-APIs.postman_collection.json`
- **Guide:** See `docs/POSTMAN_COLLECTION_GUIDE.md`

The collection includes:
- All endpoints with pre-configured requests
- Automatic token management
- Test scripts for validation
- Collection variables (`baseUrl`, `accessToken`, `refreshToken`, `templateId`)

---

## Demo Users

For testing, use these demo users (password for all: `demo123`):

| Email | Full Name | Role | Department |
|-------|-----------|------|------------|
| sarah.admin@company.com | Sarah Johnson | admin | QA |
| john.requestor@company.com | John Smith | requestor | DOC |
| robert.manager@company.com | Robert Taylor | manager_reviewer | QA |
| patricia.approver@company.com | Patricia Davis | approver | REG |

---

## Phase 1 Status

### Completed
- âœ… **1.1 Authentication & Identity** - Login, refresh, logout, password reset, user profile, roles, departments, navigation
- âœ… **1.2 Dashboards & Navigation** - Request counts, recent requests/templates, KPIs
- âœ… **1.3 Templates & AI-Assisted Document Preparation** - Upload, list, get, get HTML, save content (HTML docx, S3), download URL, update, approve, versions, delete (with AWS S3, ConvertAPI, Gemini, and html-to-docx fallback)

### Notes
- **Dashboard APIs** currently return stub data (no Request/Template entities yet in Phase 1)
- **KPIs** returns real `totalUsers` and `totalDepartments` from database
- **Password reset tokens** are logged in backend console (not sent by email in Phase 1)
- **Template files** are stored in AWS S3 with presigned URLs for secure access

---

## Support & Troubleshooting

- **Database Connection Issues:** See `docs/DATABASE_CONNECTION_TROUBLESHOOTING.md`
- **S3 Integration:** See `docs/PHASE1_3_S3_TEST_RESULTS.md`
- **Seed Data:** See `docs/PHASE1_SEED_VERIFICATION.md`
- **Postman Collection:** See `docs/POSTMAN_COLLECTION_GUIDE.md`
