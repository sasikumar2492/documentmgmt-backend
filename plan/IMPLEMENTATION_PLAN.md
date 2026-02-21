## PHARMA-DMS – Implementation Plan

This document describes the end‑to‑end implementation plan, phase‑by‑phase, with **backend** and **frontend** responsibilities described separately. It follows:

- Backend‑first approach.
- Clean architecture (routes → controllers → services → repositories/models → mailers/notifications).
- React + RTK Query on the frontend.
- PostgreSQL + Prisma + Express on the backend.

---

## Phase 1 – UI & Requirements Analysis

### Backend

- **Domain discovery**
  - Refine entity list (Users, Roles/Permissions, Departments, Templates, Requests, Workflows, Remarks, Training, Notifications, Audit Logs, Tickets, SOP/Rules, Settings) based on the current UI and client feedback.
  - Decide which parts are strongly structured tables vs `jsonb` metadata (dynamic forms, workflow rules, configuration).

- **API surface inventory**
  - From each screen and user flow, draft a first pass list of API endpoints, grouped by module:
    - Auth: login, refresh, register (if required), forgot/reset password.
    - Templates: upload, list, detail, approve, version listing.
    - Requests: CRUD, status transitions, search/filter.
    - Workflows: definitions, configuration, runtime progression.
    - Libraries & reports: listing, filtering, document actions.
    - Publishing, training, effectiveness, notifications, audit, admin, ticketing.
  - For each endpoint, record:
    - HTTP method and path.
    - Expected request/response shapes (at a high level).
    - Primary status codes (200/201/204/400/401/403/404/409/422/500).

### Frontend

- **Component & view mapping**
  - For each major component/view (e.g., `Dashboard`, `PreparatorDashboard`, `RaiseRequest`, `DocumentManagement`, document libraries, workflows, training, admin, audit, notifications):
    - Document purpose, key data it needs, and what user actions it triggers.
    - Map existing mock structures such as `TemplateData`, `ReportData`, `TrainingRecord`, `NotificationData`, `AuditLogEntry` to conceptual backend entities.

- **User flows & auth-required screens**
  - Trace end‑to‑end flows:
    - Template upload → AI conversion → workflow approval → template saved/approved.
    - Template → Raise Request → review/approve/reject/revise → publish → training → effectiveness checks.
    - TicketFlow login → ticket creation → ticket updates → resolution/closure.
  - For each flow, identify:
    - Screens visited and transitions.
    - Roles involved at each step.
    - Points where backend calls will replace mock state.

- **Notification touchpoints**
  - On each flow, mark when the user expects:
    - In‑app notifications.
    - Emails (submission confirmation, approval, rejection, revision requested, training assigned, ticket created, etc.).

---

## Phase 2 – System Design

### Backend

- **Finalize database schema**
  - Use `PROJECT_UNDERSTANDING.md` as the source of truth.
  - Lock down:
    - Tables, fields, relations, indexes (PostgreSQL).
    - Prisma model names and relationships (without generating code yet here).
  - Decide any MVP cuts (e.g., TicketFlow or some advanced analytics if needed later).

- **API design**
  - For each module, define the API contract:
    - Auth: `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/register` (if applicable).
    - Users/Admin: `/users`, `/roles`, `/permissions`, `/departments`, `/enterprise-settings`, `/sops`.
    - Templates: `/templates/upload` (multipart/form-data), `/templates`, `/templates/:id`, `/templates/:id/download` (presigned URL), `/templates/:id/approve`, `/templates/:id/versions`.
    - Requests: `/requests`, `/requests/:id`, `/requests/:id/submit`, `/requests/:id/approve`, `/requests/:id/reject`, `/requests/:id/request-changes`, `/requests/:id/publish`.
    - Workflows: `/workflows`, `/workflows/:id`, `/workflow-rules`, `/requests/:id/workflow`.
    - Training: `/training-records`, `/documents/published`, `/documents/published/:id/effectiveness-checks`.
    - Notifications & email: `/notifications`, `/notifications/read`, `/notifications/read-all`, `/notification-settings`.
    - Audit logs: `/audit-logs`.
    - Tickets: `/tickets`, `/tickets/:id`, `/tickets/:id/comments`.
  - Define:
    - Common pagination params (e.g., `page`, `pageSize`, `sortBy`, `sortDir`).
    - Standard error response shape (code, message, details).
    - File upload handling: multipart/form-data for template uploads, max file size limits (e.g., 50MB).
    - Presigned URL generation: expiration time (e.g., 1 hour), security considerations.

- **Auth & authorization design**
  - JWT token structure:
    - Access token: short‑lived, contains `sub` (userId), `roles`, `departmentId`, `orgId`.
    - Refresh token: long‑lived, rotation strategy, storage and revocation model.
  - RBAC:
    - Map UI roles (`admin`, `requestor`, `preparator`, `manager`, `manager_reviewer`, `manager_approver`, `reviewer`, `approver`, etc.) to backend role entities.
    - Define permission keys (e.g., `request.view`, `request.approve`, `template.manage`, `user.manage`).

- **Email & notifications strategy**
  - Enumerate notification event types:
    - E.g., `user_registered`, `password_reset_requested`, `request_submitted`, `request_resubmitted`, `request_approved`, `request_rejected`, `needs_revision`, `template_published`, `training_assigned`, `ticket_created`, `ticket_status_changed`.
  - For each event, define:
    - Recipients (per role/user/department).
    - Default in‑app vs email behavior.
    - Email subject/body templates (placeholders only at this stage).
  - Define failure handling:
    - Logging strategy for failed sends.
    - Retries and dead‑letter cases (to be implemented in Phase 7).

### Frontend

- **API contract alignment**
  - Translate backend DTOs into TypeScript interfaces and types:
    - `AuthResponse`, `UserDto`, `TemplateDto`, `RequestDto`, `WorkflowDto`, `TrainingRecordDto`, `NotificationDto`, `AuditLogDto`, `TicketDto`, etc.
  - Align existing UI types (`TemplateData`, `ReportData`, `TrainingRecord`, `NotificationData`, `AuditLogEntry`) with backend DTOs; plan any minimal mapping required.

- **RTK Query design**
  - Plan RTK Query API slices:
    - `authApi`, `templateApi`, `requestApi`, `workflowApi`, `trainingApi`, `notificationApi`, `auditApi`, `adminApi`, `analyticsApi`, `ticketApi`.
  - Decide on:
    - Base query configuration (base URL from environment, error handling, auth headers).
    - Tag types for cache invalidation per entity (e.g., `Templates`, `Requests`, `Notifications`).

---

## Phase 3 – Backend Foundation

### Backend

- **Project structure (clean architecture)**
  - Create Node/Express project with structure similar to:
    - `src/config` – configuration & environment.
    - `src/routes` – Express route definitions (no business logic).
    - `src/controllers` – HTTP controllers, mapping requests/responses.
    - `src/services` – business logic and orchestration.
    - `src/repositories` (Prisma) – database access layer.
    - `src/middlewares` – auth, validation, logging, error handling.
    - `src/notifications` or `src/mail` – email and notification orchestration.
    - `src/utils` and `src/errors`.

- **Database connection & Prisma configuration**
  - Configure PostgreSQL connection using environment variables.
  - Initialize Prisma, configure:
    - Schema file reflecting conceptual data model.
    - Relations, enums, and indices.
  - Generate first migrations:
    - Core tables (`organizations`, `departments`, `roles`, `users`, `document_templates`, `document_requests`, `notifications`, `audit_logs`, etc.).
    - Seed essential data (default roles/permissions, initial admin user, base departments).

- **Global error handling**
  - Create standardized error classes (e.g., `AppError` with code & status).
  - Implement Express error middleware:
    - Map domain errors to HTTP status codes.
    - Hide internal details in production while logging full details.

- **Logging & middleware**
  - Integrate `pino` or `winston` for structured logs.
  - Add:
    - Request logging middleware (method, path, user, latency).
    - Security middlewares (CORS, `helmet`, rate limiting).
    - JSON body parsing and size limits.

- **Email service setup**
  - Implement a `MailService` abstraction:
    - Backed by Nodemailer (SMTP or provider like SendGrid, SES).
    - Uses HTML templates (add folder/strategy without implementing content yet).
    - Records each send attempt into `email_logs`.
  - Expose a service‑level API: `sendNotificationEmail(eventKey, context)` to be used only from domain services.

- **AWS S3 service setup**
  - Install AWS SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.
  - Configure S3 client:
    - Environment variables: `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
    - For production: use IAM roles instead of access keys when running on AWS infrastructure.
  - Create `S3Service` abstraction (`src/services/s3Service.ts`):
    - `uploadFile(bucket, key, fileBuffer, contentType, metadata)` – upload file to S3.
    - `generatePresignedUrl(bucket, key, expiresIn)` – generate presigned URL for secure download.
    - `deleteFile(bucket, key)` – delete S3 object.
    - `getFileMetadata(bucket, key)` – get file metadata (size, last modified).
    - Error handling for S3 operations (network errors, access denied, bucket not found).
  - S3 bucket structure:
    - `{bucket}/templates/{templateId}/{version}/{original-filename}`.
    - Example: `pharma-dms-templates/550e8400-e29b-41d4-a716-446655440000/v1/Part_Approval_Form.xlsx`.
  - Create S3 bucket (manual step or infrastructure-as-code):
    - Bucket name: `pharma-dms-templates` (or from env var).
    - Region: match `AWS_REGION`.
    - Versioning: enable for audit trail (optional).
    - Lifecycle policies: archive old versions after X days (optional).
    - CORS configuration: allow frontend domain to request presigned URLs.

### Frontend

- **Environment‑based configuration**
  - Introduce a configuration module:
    - API base URL (per environment).
    - Feature flags (e.g., enable/disable TicketFlow, advanced analytics).
  - Ensure Vite/React or build setup uses environment variables cleanly.

- **Global error/loading UX baseline**
  - Standardize:
    - Loading indicators/skeletons across pages.
    - Error messages derived from HTTP error payloads.
  - Integrate with existing toast system (`sonner`) for user feedback.

- **No major feature rewiring yet**
  - Keep mocks in place.
  - Optionally refactor some containers to separate:
    - Presentation components (unchanged layouts).
    - Data/logic hooks (to ease RTK Query integration in Phase 6).

---

## Phase 4 – Authentication & Authorization

### Backend

- **Auth endpoints**
  - Implement:
    - `POST /auth/login` – username/email + password → access + refresh tokens.
    - `POST /auth/refresh` – refresh token → new access token.
    - `POST /auth/forgot-password` – generate reset token, email link.
    - `POST /auth/reset-password` – validate token, set new password.
    - `POST /auth/register` – admin‑only, optional (user provisioning).

- **Middlewares**
  - `authenticate`:
    - Validate access token.
    - Attach `req.user` (id, roles, department, org, permissions).
  - `authorize`:
    - Check required role(s) and/or permission(s) per route.

- **JWT & sessions**
  - Implement token issuance and verification logic:
    - Short‑lived access token.
    - Refresh token issuing/rotation.
    - Optional token blacklist or session store (for logout).

- **Auth‑related emails**
  - On registration: send welcome/verification email as configured.
  - On password reset request: send reset email with secure token.
  - Log all attempts in `email_logs`, including failures.

- **Audit integration**
  - Log:
    - `user_login`, `user_logout`, password reset events.
    - Suspicious activity (multiple failed logins, optional).

### Frontend

- **Auth state & RTK Query**
  - Create `authApi` slice:
    - `login`, `refresh`, `forgotPassword`, `resetPassword`, `register` (if needed).
  - Implement:
    - Token storage (access token in memory or local storage with care).
    - Automatic attachment of access token to authorized requests.
    - Automatic refresh on 401 where appropriate.

- **Route protection**
  - Introduce:
    - Auth guard components/HOCs or hooks (`useAuthGuard`).
  - Replace mock `isSignedIn` logic with real auth state:
    - Redirect unauthenticated users to `SignInPage`.
    - Redirect newly authenticated users to role‑specific dashboards.

- **Role‑aware UI**
  - Use roles from JWT/`authApi` to:
    - Show/hide sidebar entries (Admin vs Preparator vs Reviewer vs Approver).
    - Disable actions the user is not allowed to perform (e.g., publish, manage users).

---

## Phase 5 – Core Business Modules (Backend‑First, per Module)

All modules in this phase are implemented backend‑first, then wired to the frontend. Work can run in parallel for different modules as long as interfaces are stable.

### 5.1. Templates & AI Conversion

Flow: **Upload .doc/.docx (frontend) → Store in local DB (backend) → Convert to PDF (ConvertAPI) → Gemini to HTML → Return HTML (API) → Editable HTML (frontend) → Reconvert to .doc/.docx (backend) → Update file in S3 (backend).**

#### Backend

- **Local DB storage (Step 2)**:
  - On upload, store template **metadata and file reference** in local DB first (file as blob or temp path). Do not upload to S3 until after user has edited HTML and backend has reconverted to .doc/.docx (Step 8).

- **ConvertAPI integration (Steps 3 & 7)**:
  - **Step 3:** Convert uploaded **.doc/.docx → PDF**. Use ConvertAPI (or equivalent) with API key from env (e.g. `CONVERT_API_SECRET`).
  - **Step 7:** Convert **HTML → .doc/.docx** when user saves edited content. Call ConvertAPI (or equivalent) with edited HTML; receive binary .docx.
  - Add `convertApiService` or similar in `src/services/` to encapsulate ConvertAPI calls.

- **Gemini integration (Step 4)**:
  - **Step 4:** Send PDF (or extracted text) to **Gemini**; get back **HTML**.
  - Configure Gemini API key and model via env (e.g. `GEMINI_API_KEY`, `GEMINI_MODEL`).
  - Add `geminiService` or similar in `src/services/` for PDF/content → HTML conversion.

- **Endpoints**:
  - `POST /templates/upload`:
    - Accept **.doc or .docx only** (multipart/form-data), size limit (e.g. 50MB).
    - Store file in local DB (or temp storage); create template record with status `draft`.
    - Run pipeline: ConvertAPI (doc → PDF) → Gemini (PDF → HTML); store **HTML** in DB (or linked storage).
    - Optionally do **not** upload to S3 yet; S3 upload happens after user saves edited HTML (Step 8).
    - Return template DTO with `id`, `fileName`, `fileSize`, `status`; optionally include `html` in response or via separate endpoint.
  - `GET /templates/:id` and/or `GET /templates/:id/html`:
    - Return template metadata and **HTML content** (Step 5) for frontend editable view.
  - `POST /templates/:id/save-content` (or `PUT /templates/:id/content`):
    - Accept **edited HTML** in request body.
    - Reconvert HTML → .doc/.docx via ConvertAPI (Step 7).
    - Upload resulting .doc/.docx to **AWS S3** (Step 8); update template record (`s3Bucket`, `s3Key`, `version`, etc.).
    - Return updated template DTO.
  - `GET /templates` – paginate, filter by department/status (metadata only).
  - `GET /templates/:id/download` or `GET /templates/:id/preview`:
    - Generate presigned URL for the .doc/.docx file in S3 (after Step 8); return `{ downloadUrl, expiresAt }`.
  - `PATCH /templates/:id` – update metadata only.
  - `POST /templates/:id/approve` – transition to approved; optional versioning.
  - `GET /templates/:id/versions` – list versions (S3 keys; presigned URLs on demand).
  - `DELETE /templates/:id` – soft delete; optionally delete S3 object.

- **AWS S3** (used for final .doc/.docx after Step 8):
  - Install: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.
  - Env: `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
  - S3 service: `uploadFile`, `generatePresignedUrl`, `deleteFile`, `getFileMetadata`.
  - Bucket structure: `{bucket}/templates/{templateId}/{version}/{filename}.docx`.

- **Database schema** (`DocumentTemplate`):
  - `s3_bucket`, `s3_key` – for final .doc/.docx (populated after Step 8).
  - `original_file_name`, `file_size`, `mime_type`, `version`, `status`, `department_id`, etc.
  - `html_content` (text) or `html_storage_key` – stored HTML for Steps 5–6 and reconversion.
  - Optional: `parsed_sections` (jsonb), `form_schema` (jsonb) for workflow/AI features.

- `TemplateService` responsibilities:
  - Store upload in local DB; run ConvertAPI (doc→PDF) and Gemini (PDF→HTML); persist HTML.
  - Return HTML via GET template/html endpoints.
  - On save-content: reconvert HTML→doc (ConvertAPI), upload to S3, update DB.
  - Generate presigned URLs for .doc/.docx in S3; handle versioning and soft delete.

#### Frontend

- **Step 1:** Upload .doc/.docx via `POST /templates/upload` (multipart); show progress and validation errors.
- **Step 5–6:** Fetch HTML via `GET /templates/:id` or `GET /templates/:id/html`; render in an **editable HTML** editor (e.g. rich-text or HTML textarea/code editor).
- On save: send **edited HTML** to `POST /templates/:id/save-content` (or equivalent); then backend performs Steps 7–8 (reconvert, S3 update).
- Create `templateApi` slice for upload, get template, get HTML, save-content, list, download (presigned URL).

---

### 5.2. Requests & Approval Workflow

#### Backend

- Implement request APIs:
  - `POST /requests` – create a request from a template (initial draft).
  - `GET /requests` – list with filters (status, department, assignee, search, date range).
  - `GET /requests/:id` – full detail including form data and workflow status.
  - `PATCH /requests/:id` – update form data for drafts or in‑progress states.
  - `POST /requests/:id/submit` – submit into workflow.
  - `POST /requests/:id/approve`
  - `POST /requests/:id/reject`
  - `POST /requests/:id/request-changes`
  - `DELETE /requests/:id` – soft delete where allowed.
- `RequestService` responsibilities:
  - Manage `document_requests`, `document_request_form_data`.
  - Enforce valid transitions per state machine.
  - Initialize and update workflow instances (`request_workflow_instances`, `request_workflow_steps`).
  - Trigger:
    - Notifications and emails on submission, resubmission, approval, rejection, revision requested.
  - Log all key actions into `audit_logs`.

#### Frontend

- Create `requestApi` slice:
  - Integrate with:
    - `RaiseRequest` – create request and navigate to form.
    - `FormPages` – load/save/update form data.
    - `DocumentEditScreen` – load dynamic/fixed forms from backend.
    - Document libraries – listing, filtering and status updates.
  - Replace internal `useState`/`setReports` patterns:
    - Use RTK Query queries/mutations.
    - Use cache invalidation and refetch patterns to keep lists consistent.

---

### 5.3. Workflows & Rules

#### Backend

- Workflow definition APIs:
  - `GET /workflows`
  - `POST /workflows`
  - `GET /workflows/:id`
  - `PATCH /workflows/:id`
  - `GET /workflows/:id/steps`
  - `PATCH /workflows/:id/steps`
- Rules engine APIs:
  - `GET /workflow-rules`
  - `POST /workflow-rules`
  - `PATCH /workflow-rules/:id`
- Runtime workflow APIs:
  - `GET /requests/:id/workflow`
  - `POST /requests/:id/workflow/actions` – generic endpoint to approve/reject/advance/resend for revision.
- Rule evaluation:
  - On template approval and request creation, evaluate `workflow_rules` to:
    - Determine which workflow to apply.
    - Set review sequence or required roles.

#### Frontend

- Create `workflowApi` slice:
  - Wire:
    - `Workflows` – to show workflow definitions and instances.
    - `ConfigureWorkflow` – to load and save workflow steps.
    - `WorkflowConfiguration`, `WorkflowRulesSetup` – to manage high‑level rules.
    - `WorkflowApprovalStep` – to approve/reject AI‑generated flows (saving as workflows or updating template metadata).
  - Display real workflow status visualization (not only mock `AIWorkflowStep`).

---

### 5.4. Publishing, Versioning, Training, Effectiveness

#### Backend

- Publishing and versioning:
  - `POST /requests/:id/publish` – create `document_published_versions` entry, move request to `published`.
  - `GET /documents/published` – list active/superseded/archived documents.
  - `GET /documents/published/:id/versions`
- Training:
  - `GET /training-records`
  - `POST /training-records`
  - `PATCH /training-records/:id` – update status, score, completion date.
- Effectiveness:
  - `POST /documents/:publishedId/effectiveness-checks`
  - `GET /documents/:publishedId/effectiveness-checks`
- Notifications/emails:
  - On publish: email impacted roles/departments.
  - On training assignment: email trainees.
  - On training reminders/overdue: optional scheduled or triggered email.

#### Frontend

- Integrate:
  - `DocumentPublishing` with publish endpoints.
  - `DocumentEffectiveness` with effectiveness check APIs.
  - `DocumentVersioning` with published document/version endpoints.
  - `TrainingManagement` with `trainingApi` slice for listing and updating training records.
- Replace mock charts with data from `analyticsApi`:
  - E.g., counts by status, cycle times, training completion rates.

---

### 5.5. Notifications, Audit, Remarks

#### Backend

- Notifications:
  - `GET /notifications` – list in‑app notifications for current user.
  - `POST /notifications/:id/read`
  - `POST /notifications/read-all`
  - Integrate notifications pipeline into services (e.g., `NotificationService`):
    - On events (submit, approve, publish, assign training, etc.) create notification records and, if user settings allow, emails.
- Audit logs:
  - `GET /audit-logs` – filter by date range, user, entity type/id, request id.
- Remarks:
  - `GET /requests/:id/remarks`
  - `POST /requests/:id/remarks`
  - `PATCH /remarks/:id` – update status (`open`, `addressed`, `closed`).

#### Frontend

- `notificationApi` slice:
  - Connect `NotificationsHub`, `NotificationsPage`, `NotificationSettings` to real data.
  - Replace mock notifications with server‑driven lists, read/unread states, and deletion.
- `auditApi` slice:
  - Wire `AuditLogs`, `ActivityLogTable`, `ActivityLogDetail` to backend.
  - Enable filtering and drill‑down by request ID or user.
- `remarksApi` slice:
  - Connect `RemarksInbox` and `PageRemarksModal`:
    - Fetch remarks per request.
    - Allow adding/updating remarks and marking them addressed.

---

### 5.6. Administration & Settings

#### Backend

- Users:
  - `GET /users`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` (soft delete).
- Roles & permissions:
  - `GET /roles`, `GET /permissions`
  - `PATCH /roles/:id/permissions`
- Departments:
  - `GET /departments`, `POST /departments`, `PATCH /departments/:id`
- Enterprise settings & SOPs:
  - `GET /enterprise-settings`, `PATCH /enterprise-settings`
  - `GET /sops`, `POST /sops`, `PATCH /sops/:id`

#### Frontend

- `adminApi`/`settingsApi` slices:
  - Wire `UserManagement`, `RolePermissionsManagement`, `DepartmentSetupManagement`, `DepartmentsView`, `EnterpriseSettings`, `SOPConfiguration` to backend.
  - Ensure that only Admin (and possibly other privileged roles) can access these views and actions.

---

## Phase 6 – Frontend Integration (Replace Mock Data with APIs)

### Frontend

- **RTK Query rollout**
  - Incrementally integrate each UI module with its corresponding API slice:
    - Templates → `templateApi`.
    - Requests & libraries → `requestApi`.
    - Workflows → `workflowApi`.
    - Training, notifications, audit, admin, analytics → their slices.
  - Carefully remove mock data from `App.tsx` and components as real data is wired in.

- **State management cleanup**
  - Reduce local state to UI concerns only (selection, modals, filters).
  - Use server as the single source of truth for entities (templates, requests, users, etc.).

- **Error, loading, and edge states**
  - Ensure every query/mutation:
    - Shows loading feedback (spinners/skeletons).
    - Surfaces meaningful error messages from backend error payloads.
  - Handle:
    - Empty states (e.g., no templates, no requests).
    - Pagination and filters staying consistent on navigation.

- **UI feedback for email-triggered actions**
  - On actions that trigger emails (submit, approve, publish, assign training, create ticket):
    - Show success toasts indicating that emails/notifications were triggered.
    - Optionally reflect email send status if backend exposes it.

### Backend

- **Stabilization for frontend consumers**
  - Finalize DTO mappers to ensure consistent response structures.
  - Optimize query patterns if early usage shows performance issues.
  - Add any missing filters/sorting used by the frontend but not yet exposed.

---

## Phase 7 – Finalization & Production Hardening

### Backend

- **Environment configuration**
  - Ensure all secrets and environment‑dependent settings are pulled from environment variables:
    - DB connection, JWT secrets, SMTP credentials, external URLs, logging levels.
    - AWS S3: `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or use IAM roles in production).
  - Provide environment‑specific config for dev/stage/prod:
    - Separate S3 buckets per environment (e.g., `pharma-dms-templates-dev`, `pharma-dms-templates-prod`).
    - Different AWS regions if needed for compliance.

- **Email failure handling & retries**
  - Implement:
    - A retry mechanism for `pending`/`failed` email logs, with capped backoff.
    - Dead‑letter or alerting when emails permanently fail.

- **Security best practices**
  - Validate:
    - Input validation for all endpoints (e.g., `zod`, `joi`, or custom).
    - Proper CORS and HTTPS termination configuration.
    - Rate limiting for auth and key write operations.
    - Least‑privilege roles for the DB user.
  - Consider:
    - Audit and monitoring integration (e.g., log shipping, alerts).

- **Performance considerations**
  - Add and tune indexes for:
    - High‑volume queries (requests list, audit logs, notifications).
    - Common filters (status, department, assignee, date ranges).
  - Evaluate need for:
    - Caching (e.g., read‑only reference data).
    - Async jobs for heavy operations (bulk notifications, report generation).

- **Deployment readiness**
  - Containerization:
    - Dockerfile for backend.
    - docker‑compose for local orchestration with PostgreSQL.
  - Health checks:
    - `/health` and `/ready` endpoints.
  - Migration strategy:
    - Clear playbooks for running migrations on deploy.
  - Backup and restore strategy for PostgreSQL.

### Frontend

- **Build & deployment**
  - Setup:
    - Environment‑specific builds (API URLs, feature flags).
    - CI/CD pipeline steps for lint/build/test/deploy.

- **Regression and UX polish**
  - Confirm:
    - All routes function as expected with real data.
    - UI layout/design/styling remains unchanged (only data sources changed).
    - Role‑based access and route guards behave correctly.
  - Address remaining UX corner cases:
    - Edge error messages, timeouts, offline support (if needed).

---

This implementation plan will serve as the execution roadmap. Subsequent work will translate each phase into concrete tasks (tickets), starting with backend schema and foundation, then progressively integrating each module on the frontend via RTK Query while strictly preserving the existing UI.

