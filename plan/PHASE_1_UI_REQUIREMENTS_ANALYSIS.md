## Phase 1 – UI & Requirements Analysis (Backend-Focused)

This document captures the concrete outcomes of **Phase 1**, based on the existing React UI (`documentmgmt-frontend`) and the agreed architecture for `documentmgmt-backend`.

The goal is to:

- Map **UI screens and flows** to backend responsibilities.
- Refine the list of **business entities** the backend must support.
- Draft an initial **API surface inventory** (resources and endpoints).
- Identify **email & notification** expectations from a user perspective.

This serves as the baseline for Phase 2 (System Design & Schema/API finalization).

---

### 1. UI Modules → Backend Responsibilities

The existing frontend is a single-page React app with role-aware navigation and many feature components. Below is a backend-oriented mapping of key views.

#### 1.1. Authentication & Access

- **Home Landing (`HomePage`)**
  - Public; mostly static/marketing plus routing to:
    - DMS login.
    - Ticket Flow login.
  - **Backend needs**:
    - None directly; only redirects to auth routes.

- **Ticket Flow Login (`TicketFlowLogin`)**
  - Purpose:
    - Dedicated login for Ticket Flow module (support/deviation/CAPA style workflows).
  - **Backend needs**:
    - Auth endpoints that can distinguish **TicketFlow context** vs DMS context (could still share users/roles).
    - Support for ticket-related roles/permissions (if separated).

- **Standard Auth (`SignInPage`)**
  - Purpose:
    - Login to the main DMS with roles (admin, preparator, reviewer, approver, managers, etc.).
  - **Backend needs**:
    - `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`.
    - JWT-based session handling.
    - User + role + department retrieval for navigation decisions.

#### 1.2. Dashboards & Navigation

- **Dashboards (`Dashboard`, `PreparatorDashboard`, `AdminHomeDashboard`)**
  - Show:
    - Assigned requests by status.
    - Recent templates/documents.
    - KPIs (counts, charts).
  - **Backend needs**:
    - Aggregated endpoints for:
      - Request counts per status/role/department.
      - Recently created requests and templates.
    - Filters based on:
      - Current user, roles, departments.
      - Time ranges (e.g., last 7/30/90 days).

- **Sidebars (`LeftSidebar`, `AdminSidebar`)**
  - Navigation only; no data.
  - **Backend needs**:
    - Role/permission info for which modules/routes are available.

#### 1.3. Templates & AI-Assisted Document Preparation

- **Upload Templates / Document Management (`UploadTemplates`, `DocumentManagement`)**
  - Flows:
    - User uploads Word/Excel/PDF.
    - Frontend invokes parsers to extract sections & fields.
    - AI proposes workflows and dynamic forms.
  - **Backend needs**:
    - **Template resource**:
      - Create template with metadata (file name, size, department).
      - Persist parsed sections and AI-generated form schema.
      - Track status (`draft`, `pending_approval`, `approved`, `deprecated`).
    - Optional file storage integration (if backend will store physical files/blobs).

- **Workflow Approval for AI Flow (`WorkflowApprovalStep`)**
  - Flow:
    - Preparator/Admin reviews AI-generated workflow for uploaded template.
    - Approve → proceed to AI conversion preview.
    - Reject → back to upload.
  - **Backend needs**:
    - Endpoint to **save AI workflow proposal** associated with a template.
    - Endpoint to **approve/reject** that workflow for the template.
    - Optional audit logging for workflow approvals.

- **AI Conversion Preview (`AIConversionPreview`)**
  - Flow:
    - User edits AI-extracted sections and fields.
    - On save, a **Template** with form schema becomes available to Raise/Requests.
  - **Backend needs**:
    - Endpoint to **save final form schema** for a template.
    - Support for **versioning** of templates over time.

#### 1.4. Request Creation & Approval Forms

- **Raise Request (`RaiseRequest`)**
  - Flow:
    - User selects a template.
    - A new request is created and enters draft/pending state.
  - **Backend needs**:
    - Endpoint to **instantiate a new request** from a template.
    - Initial **draft form data** (either empty or derived from template defaults).
    - Assignment of initial owner/requestor information.

- **Multi-Page Approval Form (`FormPages`)**
  - Displays:
    - Structured multi-page form aligned to domain (request info, QA review, review process, QA & management, final registration).
  - Actions:
    - Save, Reset, Submit, Approve, Cancel, Reject, Request Revisions.
  - **Backend needs**:
    - Endpoint(s) to:
      - **Fetch** complete form data for a request.
      - **Save partial updates** (draft changes).
      - Transition statuses across defined states (pending, submitted, in review, approved, rejected, needs_revision, etc.).

- **Dynamic Document Edit (`DocumentEditScreen`)**
  - Unified viewer/editor for:
    - Dynamic AI forms.
    - Advanced fixed forms.
  - Integrations:
    - Activity logs (per request).
    - Status, role-based actions.
  - **Backend needs**:
    - Requests and form data endpoints (as above).
    - Activity (audit) endpoints for that request.
    - Workflow status per step/role.

#### 1.5. Libraries & Workflows

- **Document Libraries (`DocumentLibrary`, `PreparatorDocumentLibrary`, `ReviewerDocumentLibrary`, `ApproverDocumentLibrary`)**
  - Purpose:
    - Provide role-specific task lists for requests/documents.
  - Filters:
    - Status, department, assignee, search term, requestId.
  - Actions (depending on role):
    - View form, preview, approve/reject, publish, download, delete (soft).
  - **Backend needs**:
    - Requests listing endpoint with:
      - Filters: status, role context, department, assignee, search, date range.
      - Pagination and ordering.
    - Actions endpoints (approve/reject/publish/download metadata).

- **Workflows & Configuration (`Workflows`, `ConfigureWorkflow`, `WorkflowConfiguration`, `WorkflowRulesSetup`)**
  - Purpose:
    - Show workflows per template or process.
    - Configure steps, involved departments/roles.
    - Define rules for automatically choosing workflows.
  - **Backend needs**:
    - Workflow definition endpoints (CRUD).
    - Workflow steps endpoints (CRUD for ordered steps).
    - Workflow rules endpoints (CRUD, evaluation to be used in services).
    - Workflow instance endpoints per request (view runtime progression, perform actions).

#### 1.6. Publishing, Versioning, Training, Effectiveness

- **Document Publishing (`DocumentPublishing`)**
  - Purpose:
    - Surface approved requests/documents ready to be published as controlled documents.
  - **Backend needs**:
    - Endpoint to **publish** a request into a controlled document record.
    - Endpoint to list publishable items and already published documents.

- **Document Effectiveness (`DocumentEffectiveness`)**
  - Purpose:
    - Track if documents are effective in real use.
  - **Backend needs**:
    - Endpoints to create and list **effectiveness checks** per published document.
    - Ability to correlate with training statistics.

- **Document Versioning (`DocumentVersioning`)**
  - Purpose:
    - Manage document versions (active, superseded, archived).
  - **Backend needs**:
    - Published document listing and version listing per document code.
    - Support for marking a new version as active and superseding previous ones.

- **Training Management (`TrainingManagement`)**
  - Purpose:
    - Manage trainings bound to published documents.
    - Track trainee status, completion, scores.
  - **Backend needs**:
    - Training records CRUD.
    - Filters by document, user, department, status.

#### 1.7. Reporting & Analytics

- **Reports (`Reports`)**
  - Purpose:
    - Tabular list of requests with filters, preview, delete/download actions.
  - **Backend needs**:
    - Requests list with extended filters (status, date, department, creator, approver, etc.).
    - Soft delete and download endpoints.

- **Analytics Dashboards (`ReportsAnalyticsDashboard`, `AnalyticsReports`, charts)**
  - Purpose:
    - Visualizations for:
      - Request volumes and status distribution.
      - Cycle times, bottlenecks, departmental load.
      - Training completion rates.
  - **Backend needs**:
    - Summarized, aggregated endpoints (counts, groupings) for:
      - Requests by status/department/role/time bucket.
      - Training records by status/time bucket.
      - Optional SLA metrics (time between statuses).

#### 1.8. Activity, Audit & Remarks

- **Activity Log (`ActivityLogTable`, `ActivityLogDetail`)**
  - Purpose:
    - Show activity feed per request: submissions, approvals, rejections, status changes.
  - **Backend needs**:
    - Audit log storage with:
      - Action, entity_type, entity_id, user, timestamp, details.
    - Filter endpoint(s) by requestId, user, date range.

- **Audit Logs (`AuditLogs`)**
  - Purpose:
    - System-wide audit view for compliance.
  - **Backend needs**:
    - Global audit-log endpoint with filters.

- **Remarks Inbox (`RemarksInbox`, `PageRemarksModal`)**
  - Purpose:
    - Central listing of remarks assigned to a user/role.
    - Page/field-level comments with status (open/addressed/closed).
  - **Backend needs**:
    - Remark entity and endpoints:
      - Create remark for a request (optionally linked to page/field).
      - List remarks by request, assignee, status.
      - Update remark status and/or content.

#### 1.9. Administration & Settings

- **User Management (`UserManagement`)**
  - Backend needs:
    - User CRUD endpoints.
    - Role/department assignment.

- **Role & Permission Management (`RolePermissionsManagement`)**
  - Backend needs:
    - Roles list.
    - Permissions list.
    - Role-permission assignment endpoints.

- **Department Setup (`DepartmentSetupManagement`, `DepartmentsView`)**
  - Backend needs:
    - Department CRUD endpoints.

- **Enterprise & SOP (`EnterpriseSettings`, `SOPConfiguration`)**
  - Backend needs:
    - Enterprise settings read/update.
    - SOP configurations CRUD, with linkage to workflows/templates/departments.

- **Notification Settings (`NotificationSettings`)**
  - Backend needs:
    - User-specific notification settings (in-app and email per event).

#### 1.10. Notifications, Chat, Ticket Flow

- **Notifications (`NotificationsHub`, `NotificationsPage`)**
  - Backend needs:
    - Notification listing, mark-as-read/all-read, delete.
    - Notification generation from business services.

- **Chat (`Chat`)**
  - Backend needs (depending on final scope):
    - Either a simple internal messaging resource, or integration with an external assistant/chat service.

- **Ticket Flow (`TicketFlow`, `TicketFlowLogin`)**
  - Backend needs:
    - Ticket entities with comments and status transitions.
    - Separate or shared auth/role model with DMS.

---

### 2. Refined Business Entities (Backend View)

From the UI and flows, the backend must at minimum support the following entities:

- **Identity & Access**
  - `Organization` (optional if multi-tenant).
  - `User` (with department and role memberships).
  - `Role` and `Permission`.
  - `UserRole` / `RolePermission` join entities.

- **Reference & Structure**
  - `Department`.
  - `EnterpriseSettings`.
  - `SopConfiguration`.

- **Templates & Documents**
  - `DocumentTemplate` (uploaded file + AI schema).
  - `TemplateVersion` (optional, for strict versioning).
  - `DocumentRequest` (per-request workflow instance).
  - `DocumentRequestFormData` (full FormData as JSON).
  - `DocumentPublishedVersion` (controlled document record).
  - `DocumentEffectivenessCheck`.

- **Workflows & Rules**
  - `Workflow` (definition).
  - `WorkflowStep`.
  - `RequestWorkflowInstance`.
  - `RequestWorkflowStep` (runtime status).
  - `WorkflowRule` (condition/action rule set).

- **Training**
  - `TrainingRecord` (assignment/completion record).

- **Notifications & Email**
  - `NotificationEventType` (configurable events).
  - `UserNotificationSettings`.
  - `Notification` (in-app).
  - `UserNotificationState` (read/deleted flags).
  - `EmailTemplate`.
  - `EmailLog`.

- **Compliance & Activity**
  - `AuditLog` (system-wide activities).
  - `ElectronicSignature` (for sign-offs).
  - `DocumentRemark` (per-request comments/remarks).

- **Ticketing (if in scope for MVP)**
  - `Ticket`.
  - `TicketComment`.

These align closely with the conceptual data model already described in `PROJECT_UNDERSTANDING.md` and will be concretized into tables and Prisma models in Phase 2.

---

### 3. Initial API Surface Inventory (First Pass)

This is a first-pass list of resources and endpoints inferred from the UI. Exact payloads and detailed validation rules will be finalized in Phase 2.

#### 3.1. Auth & Identity

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- (Optional) `POST /auth/register` (admin-only)

#### 3.2. Users, Roles, Departments

- Users:
  - `GET /users`
  - `POST /users`
  - `GET /users/:id`
  - `PATCH /users/:id`
  - `DELETE /users/:id` (soft)
- Roles & Permissions:
  - `GET /roles`
  - `GET /permissions`
  - `PATCH /roles/:id/permissions`
- Departments:
  - `GET /departments`
  - `POST /departments`
  - `GET /departments/:id`
  - `PATCH /departments/:id`

#### 3.3. Templates & AI Conversion

- Templates:
  - `POST /templates/upload`
  - `GET /templates`
  - `GET /templates/:id`
  - `PATCH /templates/:id`
  - `POST /templates/:id/approve`
  - `GET /templates/:id/versions`

#### 3.4. Requests & Forms

- Requests:
  - `POST /requests` – create from template.
  - `GET /requests` – list with filters.
  - `GET /requests/:id`
  - `PATCH /requests/:id` – update form data (draft/in-progress).
  - `POST /requests/:id/submit`
  - `POST /requests/:id/approve`
  - `POST /requests/:id/reject`
  - `POST /requests/:id/request-changes`
  - `DELETE /requests/:id`
- Request form data (can be implicitly included in `GET /requests/:id`/`PATCH /requests/:id` or exposed separately as):
  - `GET /requests/:id/form-data`
  - `PUT /requests/:id/form-data`

#### 3.5. Workflows & Rules

- Workflows:
  - `GET /workflows`
  - `POST /workflows`
  - `GET /workflows/:id`
  - `PATCH /workflows/:id`
  - `GET /workflows/:id/steps`
  - `PATCH /workflows/:id/steps`
- Workflow rules:
  - `GET /workflow-rules`
  - `POST /workflow-rules`
  - `GET /workflow-rules/:id`
  - `PATCH /workflow-rules/:id`
- Workflow runtime:
  - `GET /requests/:id/workflow`
  - `POST /requests/:id/workflow/actions`

#### 3.6. Publishing, Versioning, Training, Effectiveness

- Publishing & versions:
  - `POST /requests/:id/publish`
  - `GET /documents/published`
  - `GET /documents/published/:id`
  - `GET /documents/published/:id/versions`
- Training:
  - `GET /training-records`
  - `POST /training-records`
  - `GET /training-records/:id`
  - `PATCH /training-records/:id`
- Effectiveness:
  - `GET /documents/published/:id/effectiveness-checks`
  - `POST /documents/published/:id/effectiveness-checks`

#### 3.7. Reporting & Analytics

- Reports (requests list):
  - `GET /reports/requests` (may be an alias to `/requests` with more filters)
- Analytics:
  - `GET /analytics/requests-summary`
  - `GET /analytics/training-summary`
  - (Optional) separate endpoints for per-role dashboards.

#### 3.8. Notifications & Email

- Notifications:
  - `GET /notifications`
  - `POST /notifications/:id/read`
  - `POST /notifications/read-all`
  - `DELETE /notifications/:id`
- Notification settings:
  - `GET /notification-settings`
  - `PATCH /notification-settings`
- Email templates & logs (admin-only):
  - `GET /email-templates`
  - `PATCH /email-templates/:id`
  - `GET /email-logs` (with filters).

#### 3.9. Audit, Activity & Remarks

- Audit logs:
  - `GET /audit-logs`
- Activity logs (request-focused view built from audit logs):
  - Either reuse `GET /audit-logs?requestId=...`
  - Or a convenience endpoint `GET /requests/:id/activity`
- Remarks:
  - `GET /requests/:id/remarks`
  - `POST /requests/:id/remarks`
  - `PATCH /remarks/:id`

#### 3.10. Enterprise & SOP

- Enterprise settings:
  - `GET /enterprise-settings`
  - `PATCH /enterprise-settings`
- SOPs:
  - `GET /sops`
  - `POST /sops`
  - `GET /sops/:id`
  - `PATCH /sops/:id`

#### 3.11. Tickets (Ticket Flow)

- Tickets:
  - `GET /tickets`
  - `POST /tickets`
  - `GET /tickets/:id`
  - `PATCH /tickets/:id`
- Ticket comments:
  - `GET /tickets/:id/comments`
  - `POST /tickets/:id/comments`

This inventory is intentionally broad; in Phase 2 we can confirm which endpoints are in-scope for the initial MVP and which can be deferred.

---

### 4. Email & Notification Expectations (User Perspective → Backend Events)

Based on the UI and flows, users expect emails and/or in-app notifications at least for:

- **Account & Security**
  - Account creation (welcome/verification).
  - Password reset requested.
  - Password changed (optional security alert).

- **Request Lifecycle**
  - New request submitted.
  - Request resubmitted after revision.
  - Request assigned or reassigned.
  - Request approved (final).
  - Request rejected.
  - Request sent back for revision (with remarks).
  - Approval required (next reviewer/approver in the chain).
  - Optional SLA breaches (overdue approvals).

- **Template & Document Lifecycle**
  - Template created/approved.
  - Document published.
  - New version of controlled document released.
  - Document archived or superseded.

- **Training & Effectiveness**
  - Training assignment.
  - Training reminders for pending/overdue items.
  - Training completion confirmation.
  - Document effectiveness checks that raise concerns (optional).

- **Ticket Flow**
  - Ticket created.
  - Ticket assigned.
  - Ticket status changed (in-progress, resolved, closed).

- **System & Administration**
  - High error rates or failures in background processing (e.g., parsing failures).
  - Bulk configuration changes (optional).
  - Compliance-relevant events flagged by audit (optional).

These expectations will be mapped to concrete `NotificationEventType` definitions and email templates in later phases.

---

### 5. Phase 1 Status

- **UI structure analyzed**: major screens, forms, and navigation are mapped to backend responsibilities.
- **Core entities identified**: refined entity list matches the UI and business flows.
- **Initial API surface drafted**: resources and endpoints inferred from UI, to be finalized in Phase 2.
- **Notification expectations captured**: all major user-visible email/notification moments are listed.

Pending your approval, this document completes **Phase 1 – UI & Requirements Analysis** and will be used as input for **Phase 2 – System Design (Database Schema & API Contracts)**.

