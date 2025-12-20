# Story 18.1: Create Production Projects

Status: done

## Story

**As a** publisher,
**I want** to create production projects for titles,
**So that** I can track the production process from manuscript to print.

## Context

Epic 18 (Production Pipeline) enables publishers to manage the manuscript-to-print workflow. This foundational story establishes the production project infrastructure including database schema, CRUD operations, file uploads, and status tracking.

### Dependencies
- Epic 2 (Title Management) - Complete
- Epic 7 (Contacts) - Complete (vendor contacts for future task assignment)
- Epic 6 (Audit Logging) - Complete (audit trail pattern to follow)
- AWS S3 storage pattern from `src/lib/storage.ts`

### FRs Covered
- **FR161:** Publisher can create production projects for titles with manuscript upload

## Acceptance Criteria

### AC1: Create Production Project
- **Given** I am a publisher (owner/admin/editor role)
- **When** I navigate to Production section
- **Then** I can create a production project by selecting a title, setting target date, and optionally uploading manuscript (PDF/DOCX/DOC, max 50MB)
- **And** the project is created with status "draft"

### AC2: Production Project Status
- **Given** a production project exists
- **Then** status is one of: `draft`, `in-progress`, `completed`, `cancelled`
- **And** only valid transitions are allowed (draft→in-progress→completed, any→cancelled)

### AC3: Manuscript File Upload
- **Given** I am creating or editing a production project
- **When** I upload a manuscript file
- **Then** file is uploaded to S3 with tenant-scoped path
- **And** I can download or replace the file later

### AC4: View Production Projects List
- **Given** I am a publisher
- **When** I navigate to Production
- **Then** I see projects with: title, target date, status, created date
- **And** I can filter by status and search by title name

### AC5: View Production Project Detail
- **Given** I click on a production project
- **Then** I see full details with manuscript download link
- **And** I can edit the project and change status

### AC6: Tenant Isolation & Audit
- **Given** production projects are multi-tenant
- **Then** RLS policies enforce isolation
- **And** all CRUD operations are logged to audit_logs table

## Tasks

- [x] Task 1: Create database schema with migration
- [x] Task 2: Extend S3 storage for manuscript uploads
- [x] Task 3: Create Zod schemas and types
- [x] Task 4: Create server actions with audit logging
- [x] Task 5: Create queries (list, detail, available titles, count)
- [x] Task 6: Build UI components (form, list, detail, split-view)
- [x] Task 7: Create Production page and add to navigation
- [x] Task 8: Write tests

## Dev Notes

### Module Structure
```
src/modules/production/
├── actions.ts       # Server actions (use db for writes)
├── queries.ts       # Read queries (use adminDb for reads)
├── schema.ts        # Zod validation + status constants
├── types.ts         # TypeScript interfaces
└── components/
    ├── production-project-form.tsx
    ├── production-project-list.tsx
    ├── production-project-detail.tsx
    ├── production-split-view.tsx
    └── status-badge.tsx
```

### Task 1: Database Schema

Create `src/db/schema/production-projects.ts`:

```typescript
import { pgTable, uuid, text, timestamp, pgEnum, varchar, date } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

export const productionStatusEnum = pgEnum("production_status", [
  "draft", "in-progress", "completed", "cancelled"
]);

export const productionProjects = pgTable("production_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  titleId: uuid("title_id").references(() => titles.id, { onDelete: "restrict" }).notNull(),
  targetPublicationDate: date("target_publication_date"),
  status: productionStatusEnum("status").default("draft").notNull(),
  manuscriptFileKey: text("manuscript_file_key"),
  manuscriptFileName: varchar("manuscript_file_name", { length: 255 }),
  manuscriptFileSize: text("manuscript_file_size"),
  manuscriptUploadedAt: timestamp("manuscript_uploaded_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type ProductionProject = typeof productionProjects.$inferSelect;
export type ProductionProjectInsert = typeof productionProjects.$inferInsert;
```

**Run migration:**
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Update exports:** Add to `src/db/schema/index.ts` and `relations.ts`.

### Task 2: S3 Storage

Extend `src/lib/storage.ts` with manuscript functions (follow existing pattern):

```typescript
const MANUSCRIPT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MANUSCRIPT_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];

export async function uploadManuscript(tenantId: string, projectId: string, file: File) {
  if (!MANUSCRIPT_TYPES.includes(file.type)) throw new Error("Invalid file type");
  if (file.size > MANUSCRIPT_MAX_SIZE) throw new Error("File too large (max 50MB)");

  const key = `tenants/${tenantId}/production/${projectId}/${Date.now()}-${file.name}`;
  // Use existing S3 upload pattern from statements
  return { key, fileName: file.name, fileSize: file.size };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### Task 3: Schema & Types

Create `src/modules/production/schema.ts`:

```typescript
import { z } from "zod";

export const PRODUCTION_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type ProductionStatus = typeof PRODUCTION_STATUS[keyof typeof PRODUCTION_STATUS];

// Valid status transitions
const VALID_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  "draft": ["in-progress", "cancelled"],
  "in-progress": ["completed", "cancelled"],
  "completed": ["cancelled"],
  "cancelled": [],
};

export function isValidStatusTransition(from: ProductionStatus, to: ProductionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const createProductionProjectSchema = z.object({
  titleId: z.string().uuid(),
  targetPublicationDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["draft", "in-progress", "completed", "cancelled"]),
});
```

### Task 4: Server Actions

**CRITICAL:** Use FormData for file uploads. Server Actions cannot mix JSON + FormData.

Create `src/modules/production/actions.ts`:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { productionProjects } from "@/db/schema/production-projects";
import { users, titles, auditLogs } from "@/db/schema";
import { uploadManuscript, deleteS3Object } from "@/lib/storage";
import { createProductionProjectSchema, isValidStatusTransition } from "./schema";

async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const user = await db.query.users.findFirst({ where: eq(users.clerk_user_id, userId) });
  if (!user?.tenant_id) throw new Error("No tenant context");
  if (!["owner", "admin", "editor"].includes(user.role)) throw new Error("Insufficient permissions");
  return user;
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, details?: object) {
  await db.insert(auditLogs).values({
    tenantId, userId, action, entityType, entityId,
    details: details ? JSON.stringify(details) : null,
  });
}

export async function createProductionProject(formData: FormData) {
  const user = await getAuthenticatedUser();

  const input = {
    titleId: formData.get("titleId") as string,
    targetPublicationDate: formData.get("targetPublicationDate") as string || null,
    notes: formData.get("notes") as string || null,
  };

  const validation = createProductionProjectSchema.safeParse(input);
  if (!validation.success) return { success: false, message: validation.error.message };

  // Verify title exists and no duplicate project
  const title = await db.query.titles.findFirst({
    where: and(eq(titles.id, input.titleId), eq(titles.tenant_id, user.tenant_id)),
  });
  if (!title) return { success: false, message: "Title not found" };

  const existing = await db.query.productionProjects.findFirst({
    where: and(
      eq(productionProjects.titleId, input.titleId),
      eq(productionProjects.tenantId, user.tenant_id),
      isNull(productionProjects.deletedAt)
    ),
  });
  if (existing) return { success: false, message: "Project already exists for this title" };

  const [project] = await db.insert(productionProjects).values({
    tenantId: user.tenant_id,
    titleId: input.titleId,
    targetPublicationDate: input.targetPublicationDate,
    notes: input.notes,
    status: "draft",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();

  // Handle manuscript upload
  const file = formData.get("manuscript") as File;
  if (file?.size > 0) {
    const upload = await uploadManuscript(user.tenant_id, project.id, file);
    await db.update(productionProjects).set({
      manuscriptFileKey: upload.key,
      manuscriptFileName: upload.fileName,
      manuscriptFileSize: String(upload.fileSize),
      manuscriptUploadedAt: new Date(),
    }).where(eq(productionProjects.id, project.id));
  }

  await logAudit(user.tenant_id, user.id, "CREATE", "production_project", project.id, { titleId: input.titleId });
  revalidatePath("/production");
  return { success: true, id: project.id };
}

export async function updateProjectStatus(projectId: string, newStatus: string) {
  const user = await getAuthenticatedUser();

  const project = await db.query.productionProjects.findFirst({
    where: and(eq(productionProjects.id, projectId), eq(productionProjects.tenantId, user.tenant_id), isNull(productionProjects.deletedAt)),
  });
  if (!project) return { success: false, message: "Project not found" };

  if (!isValidStatusTransition(project.status, newStatus as any)) {
    return { success: false, message: `Cannot transition from ${project.status} to ${newStatus}` };
  }

  await db.update(productionProjects).set({ status: newStatus, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(productionProjects.id, projectId));

  await logAudit(user.tenant_id, user.id, "UPDATE_STATUS", "production_project", projectId, { from: project.status, to: newStatus });
  revalidatePath("/production");
  return { success: true };
}

export async function deleteProductionProject(projectId: string) {
  const user = await getAuthenticatedUser();
  if (!["owner", "admin"].includes(user.role)) return { success: false, message: "Only admins can delete" };

  const project = await db.query.productionProjects.findFirst({
    where: and(eq(productionProjects.id, projectId), eq(productionProjects.tenantId, user.tenant_id)),
  });
  if (!project) return { success: false, message: "Project not found" };

  // Soft delete
  await db.update(productionProjects).set({ deletedAt: new Date(), updatedBy: user.id })
    .where(eq(productionProjects.id, projectId));

  await logAudit(user.tenant_id, user.id, "DELETE", "production_project", projectId);
  revalidatePath("/production");
  return { success: true };
}
```

### Task 5: Queries

Create `src/modules/production/queries.ts`:

**CRITICAL:** Use `adminDb` for read queries (bypasses RLS for server-side reads).

```typescript
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, asc, desc, count } from "drizzle-orm";
import { adminDb } from "@/db";
import { productionProjects, users, titles } from "@/db/schema";
import { getPresignedUrl } from "@/lib/storage";

export async function getProductionProjects(filter?: { status?: string; search?: string }) {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await adminDb.query.users.findFirst({ where: eq(users.clerk_user_id, userId) });
  if (!user?.tenant_id) return [];

  let where = and(eq(productionProjects.tenantId, user.tenant_id), isNull(productionProjects.deletedAt));
  if (filter?.status) where = and(where, eq(productionProjects.status, filter.status));

  const projects = await adminDb.query.productionProjects.findMany({
    where,
    with: { title: { columns: { id: true, name: true, isbn13: true } } },
    orderBy: [asc(productionProjects.targetPublicationDate), desc(productionProjects.createdAt)],
  });

  if (filter?.search) {
    const searchLower = filter.search.toLowerCase();
    return projects.filter(p => p.title?.name?.toLowerCase().includes(searchLower));
  }
  return projects;
}

export async function getProductionProject(projectId: string) {
  // Similar pattern with presigned URL generation for manuscript
}

export async function getProductionProjectsCount(tenantId: string) {
  const result = await adminDb.select({ count: count() }).from(productionProjects)
    .where(and(eq(productionProjects.tenantId, tenantId), isNull(productionProjects.deletedAt)));
  return result[0]?.count ?? 0;
}

export async function getAvailableTitlesForProduction() {
  // Returns titles without existing production projects
}
```

### Task 6: UI Components

**Form Component** - Use React Hook Form + FormData submission:
- Title selector (Combobox from shadcn/ui)
- Date picker using `@/components/ui/calendar` with Popover
- File input with drag-drop zone (max 50MB, PDF/DOCX/DOC)
- Notes textarea
- Loading state on submit

**List Component** - Follow `titles-split-view.tsx` pattern:
- Status filter dropdown
- Search input
- TanStack Table with columns: Title, Target Date, Status, Created
- Empty state: "No production projects yet. Create one to start tracking."
- Skeleton loader during fetch

**Detail Component:**
- Display all fields with formatted file size
- Manuscript download button (presigned URL)
- Status change dropdown (only valid transitions enabled)
- Edit/Delete buttons

**Status Badge:**
```typescript
const variants = { draft: "secondary", "in-progress": "default", completed: "success", cancelled: "destructive" };
```

### Task 7: Navigation

Add to sidebar config:
```typescript
{ title: "Production", href: "/production", icon: Factory, roles: ["owner", "admin", "editor"] }
```

### Testing Requirements

**Unit Tests:**
- Schema validation (valid/invalid inputs)
- Status transition validation (valid/invalid transitions)
- File size/type validation

**Action Tests:**
- Create requires owner/admin/editor
- Duplicate title project prevented
- Status transitions enforced
- Soft delete works correctly
- Audit logs created

**Query Tests:**
- Tenant isolation (can't see other tenant's projects)
- Deleted projects filtered out
- Search/filter works correctly

### References

- [Source: docs/architecture.md#L298-L309 - Production Module Structure]
- [Source: src/lib/storage.ts - S3 Upload Pattern]
- [Source: src/db/schema/audit-logs.ts - Audit Pattern]
- [Source: src/modules/titles/components/titles-split-view.tsx - Split View Pattern]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- First story in Epic 18 - creates foundational infrastructure
- Uses soft delete pattern (deletedAt) for data recovery
- Status transitions validated (draft→in-progress→completed)
- All CRUD operations logged to audit_logs
- FormData approach for file uploads (not JSON+File mix)
- Storage utilities created in production module (not lib/storage.ts)
- adminDb for queries, db for mutations
- Code review completed: fixed lint issues (array index key, unused imports/vars)

### File List

**New files:**
- `src/db/schema/production-projects.ts`
- `src/modules/production/schema.ts`
- `src/modules/production/types.ts`
- `src/modules/production/storage.ts` - Manuscript upload utilities
- `src/modules/production/actions.ts`
- `src/modules/production/queries.ts`
- `src/modules/production/components/index.ts`
- `src/modules/production/components/production-project-form.tsx`
- `src/modules/production/components/production-project-list.tsx`
- `src/modules/production/components/production-project-detail.tsx`
- `src/modules/production/components/production-split-view.tsx`
- `src/modules/production/components/status-badge.tsx`
- `src/app/(dashboard)/production/page.tsx`
- `tests/unit/production-schema.test.ts`
- `tests/unit/production-storage.test.ts`

**Modified files:**
- `src/db/schema/index.ts` - Export new schema
- `src/db/schema/relations.ts` - Add relations
- `src/lib/dashboard-nav.ts` - Add Production nav item
- `src/components/layout/dashboard-sidebar.tsx` - Add Factory icon
- `src/components/layout/dashboard-header.tsx` - Add Factory icon
