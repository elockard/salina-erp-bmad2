# Story 21.3: Upload Manuscript Files

Status: done

## Story

As an **author**,
I want **to submit manuscripts through the portal**,
so that **I can start the publication process**.

## Acceptance Criteria

1. **Given** I have a new manuscript, **When** I navigate to the upload section in author portal, **Then** I see an upload interface that accepts Word (.doc, .docx) and PDF (.pdf) files.

2. **Given** I am uploading a manuscript, **When** I select a file, **Then** I see an upload progress indicator showing upload status.

3. **Given** I have uploaded a file, **When** the upload completes, **Then** I can associate the manuscript with a title I'm credited as author on (or create submission for a new title).

4. **Given** I confirm the title association, **When** submission is complete, **Then** a draft production project is created and the manuscript file appears in the production queue.

5. **Given** a manuscript is submitted, **When** the submission is complete, **Then** the assigned editor(s) receive an in-app notification and email notification (per their preferences) about the new submission.

6. **Given** I have submitted manuscripts, **When** I view my submissions, **Then** I see a list of my manuscript submissions with status (pending review, accepted, in production).

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema/manuscript-submissions.ts` | Create | Manuscript submissions table schema |
| `src/db/schema/index.ts` | Modify | Export manuscript-submissions |
| `src/db/schema/relations.ts` | Modify | Add manuscript submission relations |
| `src/db/schema/notifications.ts` | Modify | Add `manuscript_submitted` to NOTIFICATION_TYPES |
| `src/modules/notifications/constants.ts` | Modify | Add manuscript_submitted preferences config |
| `src/modules/notifications/components/notification-item.tsx` | Modify | Add manuscript_submitted icon |
| `src/modules/manuscripts/types.ts` | Create | TypeScript interfaces |
| `src/modules/manuscripts/queries.ts` | Create | Database queries |
| `src/modules/manuscripts/actions.ts` | Create | Server actions for upload |
| `src/modules/manuscripts/index.ts` | Create | Module exports |
| `src/app/(portal)/portal/components/manuscript-upload-form.tsx` | Create | Upload form component |
| `src/app/(portal)/portal/components/author-manuscript-submissions.tsx` | Create | Submissions list component |
| `src/app/(portal)/portal/components/author-manuscript-submissions-skeleton.tsx` | Create | Loading skeleton |
| `src/app/(portal)/portal/manuscripts/page.tsx` | Create | Manuscripts page |
| `src/app/(portal)/layout.tsx` | Modify | Add Manuscripts navigation link |
| `drizzle/migrations/0016_manuscript-submissions.sql` | Create | Database migration |
| `tests/unit/manuscript-submissions.test.ts` | Create | Unit tests |

## Tasks / Subtasks

- [x] Task 1: Create manuscript_submissions database schema (AC: #3, #4, #6)
  - [x] 1.1: Create `src/db/schema/manuscript-submissions.ts` following `marketing-assets.ts` pattern
  - [x] 1.2: Define submission_status enum: 'pending_review', 'accepted', 'rejected', 'in_production'
  - [x] 1.3: Add core fields: id, tenant_id, contact_id (author), title_id (nullable for new submissions), file_name, s3_key, content_type, file_size, notes, status, created_at, updated_at
  - [x] 1.4: Add review fields: reviewed_by, reviewed_at, review_notes, production_project_id (linked after acceptance)
  - [x] 1.5: Add database indexes: (tenant_id, contact_id), (tenant_id, status)
  - [x] 1.6: Export from `src/db/schema/index.ts`
  - [x] 1.7: Add relations in `src/db/schema/relations.ts` (contact → submissions, title → submissions)
  - [x] 1.8: Generate and run migration

- [x] Task 2: Register manuscript_submitted notification type (AC: #5)
  - [x] 2.1: Add `"manuscript_submitted"` to NOTIFICATION_TYPES array in `src/db/schema/notifications.ts`
  - [x] 2.2: Add preferences config in `src/modules/notifications/constants.ts`:
    ```typescript
    { type: "manuscript_submitted", label: "Manuscript Submitted", description: "When an author submits a new manuscript", defaultInApp: true, defaultEmail: true }
    ```
  - [x] 2.3: Generate migration for notification type enum update

- [x] Task 3: Create manuscript queries and types (AC: #6)
  - [x] 3.1: Create `src/modules/manuscripts/types.ts` with `ManuscriptSubmission`, `AuthorManuscriptSubmission` interfaces
  - [x] 3.2: Create `src/modules/manuscripts/queries.ts` with `getAuthorManuscriptSubmissions(contactId, tenantId)` query
  - [x] 3.3: Add `getSubmissionById(id, tenantId)` for detail view
  - [x] 3.4: Filter by tenant_id via innerJoin pattern (defense-in-depth)
  - [x] 3.5: Include title information if associated

- [x] Task 4: Create manuscript upload server action (AC: #1, #2, #3, #4)
  - [x] 4.1: Create `src/modules/manuscripts/actions.ts` with `uploadManuscript(formData)` action
  - [x] 4.2: Use `ActionResult<{ submissionId: string }>` pattern from `production/actions.ts`
  - [x] 4.3: **REUSE EXISTING** `validateManuscriptFile()` and `uploadManuscript()` from `src/modules/production/storage.ts` (50MB limit, PDF/Word types)
  - [x] 4.4: Extract file from FormData: `const file = formData.get("file") as File; const buffer = Buffer.from(await file.arrayBuffer());`
  - [x] 4.5: Verify author has access to selected title (via `title_authors` table)
  - [x] 4.6: Upload file to S3 and create manuscript_submission record
  - [x] 4.7: Return submission ID on success

- [x] Task 5: Create production project creation action (AC: #4)
  - [x] 5.1: Add `createDraftProductionProject(submissionId)` action in `src/modules/manuscripts/actions.ts`
  - [x] 5.2: Create production project with status 'draft', workflow_stage 'manuscript_received'
  - [x] 5.3: Link submission to production project via `production_project_id` field
  - [x] 5.4: Update submission status to 'in_production'

- [x] Task 6: Create two-layer notification system (AC: #5)
  - [x] 6.1: Create `notifyEditorsOfNewSubmission(submission)` function in actions.ts
  - [x] 6.2: Find editors/admins for tenant with notification preferences
  - [x] 6.3: Create in-app notification record in `notifications` table (type: `manuscript_submitted`)
  - [x] 6.4: Use `sendNotificationEmailBatch()` from `src/modules/notifications/email.ts` to send emails respecting user preferences
  - [x] 6.5: Include manuscript details, author info, and link to review

- [x] Task 7: Create upload component (AC: #1, #2, #3)
  - [x] 7.1: Create `src/app/(portal)/portal/components/manuscript-upload-form.tsx` (client component)
  - [x] 7.2: **Reference** `src/modules/production/components/proof-upload-form.tsx` for drag-drop UI pattern
  - [x] 7.3: Use `<input type="file" accept=".pdf,.doc,.docx">` for file selection
  - [x] 7.4: Implement upload progress indicator using state
  - [x] 7.5: Add title selection dropdown (author's titles from `title_authors`)
  - [x] 7.6: Add optional "New Title Submission" option for manuscripts without existing title
  - [x] 7.7: Add notes textarea for author comments
  - [x] 7.8: Handle success/error states with toast notifications
  - [x] 7.9: Add file type icons (PDF icon for .pdf, Word icon for .doc/.docx)

- [x] Task 8: Create submissions list component (AC: #6)
  - [x] 8.1: Create `src/app/(portal)/portal/components/author-manuscript-submissions.tsx` (async server component)
  - [x] 8.2: Display submissions with: title name, file name, status badge, submitted date, file type icon
  - [x] 8.3: Add status badge styling: pending_review (yellow), accepted (green), rejected (red), in_production (blue)
  - [x] 8.4: Implement empty state following AuthorMyTitles pattern
  - [x] 8.5: Add loading skeleton with Suspense wrapper

- [x] Task 9: Create manuscript upload page/section (AC: #1)
  - [x] 9.1: Create `src/app/(portal)/portal/manuscripts/page.tsx`
  - [x] 9.2: Include ManuscriptUploadForm component
  - [x] 9.3: Include AuthorManuscriptSubmissions list below form
  - [x] 9.4: Add navigation link in portal sidebar/header

- [x] Task 10: Write unit tests (AC: All)
  - [x] 10.1: Test file validation (50MB limit per existing storage.ts, MIME types)
  - [x] 10.2: Test S3 key generation with timestamp uniqueness
  - [x] 10.3: Test submission query returns only author's submissions
  - [x] 10.4: Test tenant isolation in queries
  - [x] 10.5: Test status badge variants
  - [x] 10.6: Test title association validation (author must be credited)
  - [x] 10.7: Test production project creation on acceptance
  - [x] 10.8: Test notification preferences are respected

## Dev Notes

### Important: Manuscript vs Marketing Asset Distinction

**Marketing Assets** (Story 21.2): Publisher uploads → Author downloads (read-only for authors)
**Manuscript Submissions** (Story 21.3): Author uploads → Publisher reviews (write access for authors)

### CRITICAL: Reuse Existing Storage Functions

**Do NOT create new validation functions.** The production module already has manuscript handling:

```typescript
// src/modules/production/storage.ts - REUSE THESE
export const MANUSCRIPT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
export const MANUSCRIPT_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
export function validateManuscriptFile(file: File): void
export async function uploadManuscript(buffer, tenantId, projectId, fileName, contentType)
```

Import and use these directly. The only new function needed is S3 key generation for the contact-based path:

```typescript
// manuscripts/{tenant_id}/{contact_id}/{timestamp}-{filename}
export function generateManuscriptSubmissionS3Key(tenantId: string, contactId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `manuscripts/${tenantId}/${contactId}/${timestamp}-${sanitizedFilename}`;
}
```

### Database Schema Design

Create `src/db/schema/manuscript-submissions.ts`:

```typescript
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending_review", "accepted", "rejected", "in_production",
]);

export const manuscriptSubmissions = pgTable("manuscript_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull(),
  contact_id: uuid("contact_id").notNull().references(() => contacts.id),
  title_id: uuid("title_id").references(() => titles.id), // nullable
  file_name: varchar("file_name", { length: 255 }).notNull(),
  s3_key: varchar("s3_key", { length: 500 }).notNull(),
  content_type: varchar("content_type", { length: 100 }).notNull(),
  file_size: integer("file_size").notNull(),
  notes: text("notes"),
  status: submissionStatusEnum("status").notNull().default("pending_review"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  reviewed_by: uuid("reviewed_by").references(() => users.id),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  review_notes: text("review_notes"),
  production_project_id: uuid("production_project_id").references(() => productionProjects.id),
}, (table) => ({
  tenantContactIdx: index("manuscript_submissions_tenant_contact_idx").on(table.tenant_id, table.contact_id),
  tenantStatusIdx: index("manuscript_submissions_tenant_status_idx").on(table.tenant_id, table.status),
}));
```

### FormData File Extraction Pattern

```typescript
// In server action
const file = formData.get("file") as File;
if (!file || file.size === 0) return { success: false, error: "No file provided" };

const buffer = Buffer.from(await file.arrayBuffer());
validateManuscriptFile(file); // Reuse from production/storage.ts
```

### Two-Layer Notification Pattern

Both in-app notification AND email (respecting preferences):

```typescript
// 1. Create in-app notification
await db.insert(notifications).values({
  tenant_id: tenantId,
  user_id: editorId,
  type: "manuscript_submitted",
  title: "New Manuscript Submission",
  message: `${authorName} submitted a manuscript: ${fileName}`,
  link: `/production/submissions/${submissionId}`,
});

// 2. Send emails respecting preferences
import { sendNotificationEmailBatch } from "@/modules/notifications/email";
await sendNotificationEmailBatch(editorIds, "manuscript_submitted", emailContent);
```

### Title Association Validation

```typescript
async function validateTitleAccess(contactId: string, titleId: string, tenantId: string): Promise<boolean> {
  const titleAuthor = await db.query.titleAuthors.findFirst({
    where: and(eq(titleAuthors.contact_id, contactId), eq(titleAuthors.title_id, titleId)),
  });
  if (!titleAuthor) return false;

  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
  });
  return !!title;
}
```

### File Type Icons

```typescript
const FILE_TYPE_ICONS = {
  "application/pdf": FileText, // or specific PDF icon
  "application/msword": FileType,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileType,
};
```

### Portal Authentication Pattern

```typescript
const user = await getCurrentUser();
if (!user || user.role !== "author") redirect("/auth/sign-in");

const contact = await db.query.contacts.findFirst({
  where: and(eq(contacts.portal_user_id, user.id), eq(contacts.status, "active")),
});
if (!contact) redirect("/auth/sign-in");
// Use contact.id for all manuscript operations
```

### Testing Standards

- **Location**: `tests/unit/`
- **Framework**: Vitest
- **Key Tests**: File validation (50MB), S3 key generation, tenant isolation, title access verification, status badges, notification preferences respected

### References

- [Source: src/modules/production/storage.ts] - **EXISTING** manuscript validation/upload functions
- [Source: src/modules/production/components/proof-upload-form.tsx] - Drag-drop upload UI pattern
- [Source: src/modules/notifications/email.ts] - sendNotificationEmailBatch for preference-aware emails
- [Source: src/db/schema/notifications.ts] - NOTIFICATION_TYPES enum to extend
- [Source: src/modules/notifications/constants.ts] - Notification preferences config
- [Source: docs/epics.md#Story 21.3] - Story requirements
- [Source: docs/prd.md#FR184] - FR184: Author can upload manuscript files
- [Source: docs/architecture.md#File Storage] - S3 presigned URL pattern
- [Source: src/modules/marketing-assets/storage.ts] - S3 storage utility pattern
- [Source: src/modules/production/actions.ts] - ActionResult<T> pattern
- [Source: src/app/(portal)/portal/page.tsx:41-49] - Portal auth context pattern

### Git Intelligence

Recent commits establishing patterns:
- `cf7df4f` - Story 21.2: Marketing asset library with S3 storage, download actions
- `ec751fa` - Story 21.1: Author portal production status with tenant isolation
- `fe05f9c` - Story 18.5: Proof file upload/download patterns (manuscript validation exists here)
- `3c7efc7` - Stories 18.2-18.4: Production project creation patterns
