# Story 18.2: Assign Production Tasks to Vendors

Status: done

## Story

**As a** publisher,
**I want** to assign production tasks to vendors,
**So that** work is tracked and organized throughout the production pipeline.

## Context

Epic 18 (Production Pipeline) manages manuscript-to-print workflow. Story 18.1 established production projects with status tracking and manuscript uploads. This story adds task management within projects, allowing publishers to assign specific tasks (editing, design, printing) to vendor contacts with due dates and status tracking.

### Dependencies
- **Story 18.1** (Create Production Projects) - Complete - Provides production_projects table and module structure
- **Epic 7** (Contacts) - Complete - Provides contacts table with vendor role support
- **Epic 20.2-20.3** (Notifications) - Complete - Provides notification service for vendor emails

### FRs Covered
- **FR162:** Publisher can assign production tasks to vendors with due dates

## Acceptance Criteria

### AC1: Create Production Task
- **Given** I have an active production project (not cancelled)
- **When** I create a task within the project
- **Then** I specify task type (enum: `editing`, `design`, `proofing`, `printing`, `other`)
- **And** I enter a task name/description
- **And** I optionally assign to a vendor contact (contact with vendor role)
- **And** I set an optional due date
- **And** the task is created with status `pending`

### AC2: Task Status Tracking
- **Given** a production task exists
- **Then** status is one of: `pending`, `in-progress`, `completed`, `cancelled`
- **And** valid transitions are:
  - `pending` -> `in-progress`, `cancelled`
  - `in-progress` -> `completed`, `cancelled`
  - `completed` -> (terminal)
  - `cancelled` -> (terminal)

### AC3: Vendor Assignment
- **Given** I am assigning a task to a vendor
- **When** I select a vendor
- **Then** only contacts with `vendor` role are shown
- **And** only active vendors (status = 'active') are selectable

### AC4: Vendor Email Notification
- **Given** I assign a task to a vendor with an email address
- **When** the task is created or assigned
- **Then** an email notification is sent to the vendor
- **And** the email includes: task name, due date, project/title info
- **And** the email is sent via Resend using existing email patterns

### AC5: Task List View
- **Given** I am viewing a production project detail
- **When** I view the tasks section
- **Then** I see all tasks with: name, type, vendor, due date, status
- **And** I can filter by status
- **And** tasks are sorted by due date (soonest first), then by creation date

### AC6: Edit and Delete Tasks
- **Given** I am an owner/admin/editor
- **When** I edit a task
- **Then** I can update name, type, vendor, due date, notes
- **And** changing vendor sends notification to new vendor
- **When** I delete a task
- **Then** the task is soft-deleted (deletedAt timestamp)

### AC7: Audit Logging
- **Given** any task CRUD operation
- **Then** the operation is logged to audit_logs table
- **And** includes before/after values for updates

## Tasks

- [x] Task 1: Create database schema for production_tasks (AC: 1, 2)
  - [x] 1.1: Create `src/db/schema/production-tasks.ts` with table definition
  - [x] 1.2: Add task_type enum: editing, design, proofing, printing, other
  - [x] 1.3: Add task_status enum: pending, in-progress, completed, cancelled
  - [x] 1.4: Add foreign keys to production_projects and contacts (vendor)
  - [x] 1.5: Run `npx drizzle-kit generate` and `npx drizzle-kit migrate`
  - [x] 1.6: Update `src/db/schema/index.ts` and `relations.ts`

- [x] Task 2: Create Zod schemas and types (AC: 1, 2)
  - [x] 2.1: Add task schemas to `src/modules/production/schema.ts`
  - [x] 2.2: Add task types to `src/modules/production/types.ts`
  - [x] 2.3: Add status transition validation function

- [x] Task 3: Create server actions for tasks (AC: 1, 2, 4, 6, 7)
  - [x] 3.1: Add `createProductionTask` action
  - [x] 3.2: Add `updateProductionTask` action
  - [x] 3.3: Add `updateTaskStatus` action with transition validation
  - [x] 3.4: Add `deleteProductionTask` action (soft delete)
  - [x] 3.5: Integrate audit logging for all actions

- [x] Task 4: Create vendor notification email (AC: 4)
  - [x] 4.1: Create email template `src/modules/production/task-assignment-email.tsx`
  - [x] 4.2: Create email service `src/modules/production/task-email-service.ts`
  - [x] 4.3: Use `sendEmail` from `src/lib/email.ts` with Resend tags

- [x] Task 5: Create queries for tasks (AC: 3, 5)
  - [x] 5.1: Add `getProductionTasks(projectId, filter?)` query with vendor/project relations
  - [x] 5.2: Add `getProductionTask(taskId)` query
  - [x] 5.3: Import `getContactsByRole` from contacts module (DO NOT duplicate)
  - [x] 5.4: Add `getTasksCount(projectId)` query

- [x] Task 6: Build UI components (AC: 1, 3, 5, 6)
  - [x] 6.1: Create `task-form.tsx` with vendor selector
  - [x] 6.2: Create `task-list.tsx` with status filter and sorting
  - [x] 6.3: Create `task-status-badge.tsx` for status display
  - [x] 6.4: TaskRow inline in task-list.tsx with edit/delete actions
  - [x] 6.5: Integrate task components into production-project-detail.tsx

- [x] Task 7: Write tests (AC: all)
  - [x] 7.1: Unit tests for schema validation (tests/unit/production-task-schema.test.ts)
  - [x] 7.2: Unit tests for status transition validation
  - [ ] 7.3: Action tests for CRUD operations (deferred - requires auth mocking)
  - [ ] 7.4: Query tests for task retrieval (deferred - requires DB setup)

## Dev Notes

### Database Schema

Create `src/db/schema/production-tasks.ts`:

```typescript
import { pgTable, uuid, text, timestamp, pgEnum, varchar, date, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { productionProjects } from "./production-projects";
import { contacts } from "./contacts";
import { users } from "./users";

// Task types align with FR163 workflow stages: manuscript, editing, design, proof, print
export const taskTypeEnum = pgEnum("production_task_type", [
  "editing", "design", "proofing", "printing", "other"
]);

export const taskStatusEnum = pgEnum("production_task_status", [
  "pending", "in-progress", "completed", "cancelled"
]);

export const productionTasks = pgTable("production_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Include tenantId for RLS consistency (matches codebase pattern)
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => productionProjects.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taskType: taskTypeEnum("task_type").notNull(),
  status: taskStatusEnum("status").default("pending").notNull(),
  vendorId: uuid("vendor_id").references(() => contacts.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  tenantIdIdx: index("production_tasks_tenant_id_idx").on(table.tenantId),
  projectIdIdx: index("production_tasks_project_id_idx").on(table.projectId),
  vendorIdIdx: index("production_tasks_vendor_id_idx").on(table.vendorId),
  statusIdx: index("production_tasks_status_idx").on(table.status),
  dueDateIdx: index("production_tasks_due_date_idx").on(table.dueDate),
}));

export type ProductionTask = typeof productionTasks.$inferSelect;
export type ProductionTaskInsert = typeof productionTasks.$inferInsert;
```

**CRITICAL:** Update `src/db/schema/relations.ts` to add:
- productionProjects -> productionTasks (one-to-many)
- productionTasks -> contacts (vendor, many-to-one)
- productionTasks -> tenants (many-to-one)

### Schema Additions (`src/modules/production/schema.ts`)

```typescript
// Task types
export const TASK_TYPES = ["editing", "design", "proofing", "printing", "other"] as const;
export type TaskType = typeof TASK_TYPES[number];

// Task status
export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// Valid task status transitions
const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  "pending": ["in-progress", "cancelled"],
  "in-progress": ["completed", "cancelled"],
  "completed": [],
  "cancelled": [],
};

export function isValidTaskStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

// Zod schemas
export const createProductionTaskSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  taskType: z.enum(TASK_TYPES),
  vendorId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateProductionTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  taskType: z.enum(TASK_TYPES).optional(),
  vendorId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});
```

### Vendor Query Pattern

**REUSE EXISTING:** Do NOT create new query. Use existing `getContactsByRole` from contacts module:

```typescript
// In src/modules/production/queries.ts - import and re-export
import { getContactsByRole } from "@/modules/contacts/queries";

// Usage in components/actions:
const vendors = await getContactsByRole("vendor");
// Returns ContactWithRoles[] - active vendors with all role data

// For dropdown display, map to simple format:
const vendorOptions = vendors.map(v => ({
  id: v.id,
  name: `${v.first_name} ${v.last_name}`,
  email: v.email,
  // Vendor role_specific_data includes lead_time_days for due date hints
  leadTimeDays: v.roles.find(r => r.role === "vendor")?.role_specific_data?.lead_time_days,
}));
```

**Reference:** `src/modules/contacts/queries.ts:118-148` - already handles tenant isolation and active status filtering.

### Email Template Pattern

Follow the pattern from `src/modules/statements/email-template.tsx` and `src/modules/invoices/email-template.tsx`:

```typescript
// src/modules/production/task-assignment-email.tsx
import { Html, Head, Body, Container, Text, Heading, Hr, Section } from "@react-email/components";

interface TaskAssignmentEmailProps {
  vendorName: string;
  taskName: string;
  taskType: string;
  dueDate?: string;
  projectTitle: string;
  publisherName: string;
  notes?: string;
}

export function TaskAssignmentEmail({ vendorName, taskName, taskType, dueDate, projectTitle, publisherName, notes }: TaskAssignmentEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Heading>Production Task Assignment</Heading>
          <Text>Hello {vendorName},</Text>
          <Text>You have been assigned a new production task from {publisherName}:</Text>
          <Section>
            <Text><strong>Task:</strong> {taskName}</Text>
            <Text><strong>Type:</strong> {taskType}</Text>
            <Text><strong>Project/Title:</strong> {projectTitle}</Text>
            {dueDate && <Text><strong>Due Date:</strong> {dueDate}</Text>}
            {notes && <Text><strong>Notes:</strong> {notes}</Text>}
          </Section>
          <Hr />
          <Text style={{ color: "#666", fontSize: "12px" }}>
            This is an automated notification from Salina ERP.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function renderTaskAssignmentEmail(props: TaskAssignmentEmailProps): Promise<string> {
  return import("@react-email/render").then(({ render }) => render(<TaskAssignmentEmail {...props} />));
}
```

### Email Service Pattern

Create `src/modules/production/task-email-service.ts` following `src/modules/invoices/email-service.ts`:

```typescript
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { productionProjects } from "@/db/schema/production-projects";
import { productionTasks } from "@/db/schema/production-tasks";
import { titles } from "@/db/schema/titles";
import { tenants } from "@/db/schema/tenants";
import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import { renderTaskAssignmentEmail } from "./task-assignment-email";

export interface SendTaskAssignmentEmailParams {
  taskId: string;
  tenantId: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTaskAssignmentEmail(params: SendTaskAssignmentEmailParams): Promise<EmailResult> {
  const { taskId, tenantId } = params;

  try {
    // Fetch task with project and title
    const task = await adminDb.query.productionTasks.findFirst({
      where: eq(productionTasks.id, taskId),
    });
    if (!task || task.tenantId !== tenantId) {
      return { success: false, error: "Task not found" };
    }
    if (!task.vendorId) {
      return { success: false, error: "No vendor assigned" };
    }

    // Get vendor contact
    const vendor = await adminDb.query.contacts.findFirst({
      where: eq(contacts.id, task.vendorId),
    });
    if (!vendor?.email) {
      return { success: false, error: "Vendor has no email address" };
    }

    // Get project and title
    const project = await adminDb.query.productionProjects.findFirst({
      where: eq(productionProjects.id, task.projectId),
    });
    const title = project ? await adminDb.query.titles.findFirst({
      where: eq(titles.id, project.titleId),
    }) : null;

    // Get tenant for publisher name
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    // Render and send
    const html = await renderTaskAssignmentEmail({
      vendorName: `${vendor.first_name} ${vendor.last_name}`,
      taskName: task.name,
      taskType: task.taskType,
      dueDate: task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : undefined,
      projectTitle: title?.name || "Unknown Title",
      publisherName: tenant?.name || "Publisher",
      notes: task.notes || undefined,
    });

    const result = await sendEmail({
      from: getDefaultFromEmail(),
      to: vendor.email,
      subject: `Task Assignment: ${task.name}`,
      html,
      tags: [
        { name: "type", value: "task-assignment" },
        { name: "tenant", value: tenantId },
        { name: "task", value: taskId },
      ],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Email failed" };
  }
}
```

### UI Component Patterns

**Vendor Selector (Combobox):**
Follow the pattern from title selector in production-project-form.tsx. Use shadcn/ui Combobox with:
- Search/filter capability
- Loading state
- Empty state: "No vendors found. Add contacts with vendor role first."

**Task List:**
Follow the pattern from production-project-list.tsx with TanStack Table:
- Columns: Name, Type, Vendor, Due Date, Status, Actions
- Status filter dropdown
- Sort by due date (nulls last)
- Empty state: "No tasks yet. Create a task to track production work."

### Server Action Pattern

Add to `src/modules/production/actions.ts`:

```typescript
export async function createProductionTask(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    const input = {
      projectId: formData.get("projectId") as string,
      name: formData.get("name") as string,
      taskType: formData.get("taskType") as string,
      vendorId: formData.get("vendorId") as string || null,
      dueDate: formData.get("dueDate") as string || null,
      notes: formData.get("notes") as string || null,
    };

    const validation = createProductionTaskSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // CRITICAL: Verify project exists and is not cancelled
    const project = await adminDb.query.productionProjects.findFirst({
      where: and(
        eq(productionProjects.id, input.projectId),
        eq(productionProjects.tenantId, user.tenant_id),
        isNull(productionProjects.deletedAt)
      ),
    });
    if (!project) {
      return { success: false, message: "Project not found" };
    }
    if (project.status === "cancelled") {
      return { success: false, message: "Cannot add tasks to cancelled projects" };
    }

    // Validate vendor if provided
    if (input.vendorId) {
      const hasVendorRole = await contactHasRole(input.vendorId, "vendor");
      if (!hasVendorRole) {
        return { success: false, message: "Selected contact is not a vendor" };
      }
    }

    // Create task with tenantId
    const [task] = await db.insert(productionTasks).values({
      tenantId: user.tenant_id,
      projectId: input.projectId,
      name: input.name,
      taskType: input.taskType as TaskType,
      vendorId: input.vendorId,
      dueDate: input.dueDate,
      notes: input.notes,
      status: "pending",
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();

    // Send vendor notification if assigned
    if (input.vendorId) {
      sendTaskAssignmentEmail({ taskId: task.id, tenantId: user.tenant_id })
        .catch(err => console.error("[Production] Task email failed:", err));
    }

    // Audit log
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "production_task",
      resourceId: task.id,
      changes: { after: { projectId: input.projectId, name: input.name, vendorId: input.vendorId } },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${input.projectId}`);
    return { success: true, id: task.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to create task" };
  }
}
```

### Project Structure

```
src/modules/production/
├── actions.ts                  # Add task CRUD actions
├── queries.ts                  # Add task queries (import vendor query from contacts)
├── schema.ts                   # Add task schemas and validation
├── types.ts                    # Add task types
├── task-assignment-email.tsx   # NEW: Email template (React Email)
├── task-email-service.ts       # NEW: Email service (Resend integration)
└── components/
    ├── index.ts                # Update exports
    ├── task-form.tsx           # NEW: Task create/edit form
    ├── task-list.tsx           # NEW: Tasks list component
    ├── task-row.tsx            # NEW: Individual task row
    └── task-status-badge.tsx   # NEW: Status badge
```

### Testing Requirements

**Unit Tests (`tests/unit/production-tasks.test.ts`):**
- Schema validation (valid/invalid inputs)
- Task type validation (only allowed values)
- Status transition validation (valid/invalid transitions)

**Action Tests:**
- Create task requires owner/admin/editor
- Task must belong to existing project
- Cannot create task on cancelled project (AC1 validation)
- Vendor must have vendor role
- Status transitions enforced
- Audit logs created
- Email sent when vendor assigned

**Query Tests:**
- Tasks filtered by project
- Deleted tasks excluded
- Vendor contacts filtered by role and status

### References

- [Source: docs/epics.md - Story 18.2 requirements, FR162]
- [Source: src/db/schema/production-projects.ts - Production schema pattern with tenantId]
- [Source: src/db/schema/contacts.ts - Contact and role schema, vendor role_specific_data]
- [Source: src/modules/production/actions.ts - Production action patterns with validation]
- [Source: src/modules/contacts/queries.ts:118-148 - getContactsByRole (REUSE THIS)]
- [Source: src/modules/invoices/email-service.ts - Email service pattern with Resend]
- [Source: src/lib/email.ts - sendEmail utility, getDefaultFromEmail]
- [Source: Story 18.1 - Previous story learnings, module structure]

### Previous Story Intelligence

From Story 18.1 implementation:
- Use FormData for actions (not JSON) if file uploads might be added later
- Use `adminDb` for read queries, `db` for writes
- Storage utilities kept in production module (not shared lib)
- Soft delete pattern with deletedAt timestamp
- Status transitions validated before update
- Audit logging with before/after changes
- Always filter by `isNull(deletedAt)` in queries
- Include tenantId in all tables for RLS consistency

**Anti-Pattern Prevention:**
- DO NOT create duplicate `getVendorContacts()` - use `getContactsByRole("vendor")` from contacts module
- DO NOT skip project status validation - check for cancelled before task creation
- DO NOT forget revalidatePath calls after mutations

### Git Intelligence

Recent commit (846e6ba) shows:
- Production module follows established patterns
- Components use TanStack Table for lists
- Forms use React Hook Form with Zod validation
- Status badges use consistent variant patterns
- Navigation integrated via dashboard-nav.ts

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- Code review #1: 1 HIGH, 4 MEDIUM, 3 LOW issues found - all fixed
- Code review #2 (re-review): 0 HIGH, 3 MEDIUM, 4 LOW issues found - all fixed
- Re-review MEDIUM fixes:
  - M1: Fixed memory leak in TaskForm useEffect with cleanup pattern
  - M2: Changed getVendorOptions from dynamic to static import
  - M3: Fixed timezone edge case in overdue calculation using date-fns
- Re-review LOW fixes:
  - L1: Email failure now tracked and shows warning toast to user
  - L3: Added aria-labels to icon buttons for accessibility
  - L4: Fixed SelectItem empty value with sentinel "__none__" pattern
- Added maxLength constraints to TaskForm textareas for better UX
- Updated File List to accurately reflect actual implementation
- TaskRow implemented inline within task-list.tsx (not separate file)

### File List

**New files:**
- `src/db/schema/production-tasks.ts` - Task schema with tenantId
- `src/modules/production/task-assignment-email.tsx` - React Email template
- `src/modules/production/task-email-service.ts` - Resend email service
- `src/modules/production/components/task-form.tsx` - Task create/edit form
- `src/modules/production/components/task-list.tsx` - Task list with filters (includes TaskRow inline)
- `src/modules/production/components/task-status-badge.tsx` - Status badge
- `tests/unit/production-task-schema.test.ts` - Unit tests for schema validation
- `drizzle/migrations/0011_lean_william_stryker.sql` - Database migration

**Modified files:**
- `src/db/schema/index.ts` - Export productionTasks
- `src/db/schema/relations.ts` - Add task relations
- `src/db/schema/audit-logs.ts` - Add "production_task" to resource types
- `src/modules/production/schema.ts` - Add task schemas
- `src/modules/production/types.ts` - Add task types
- `src/modules/production/actions.ts` - Add task CRUD actions
- `src/modules/production/queries.ts` - Add task queries, import from contacts
- `src/modules/production/components/index.ts` - Export new components
- `src/modules/production/components/production-project-detail.tsx` - Integrate tasks
- `drizzle/migrations/meta/_journal.json` - Migration journal updated
