# Story 18.5: Approve or Request Corrections on Proofs

Status: done

## Story

**As a** publisher,
**I want** to approve proofs or request corrections,
**So that** production can proceed to printing or issues are addressed by the vendor.

## Context

Epic 18 (Production Pipeline) manages manuscript-to-print workflow. Story 18.4 established proof file uploads with versioning. This story adds the proof approval/rejection workflow - publishers can approve a proof (moving the project to print_ready stage) or request corrections (staying in proof stage and notifying the vendor). This is a critical gate in the production process that ensures quality before printing.

### Dependencies
- **Story 18.4** (Upload and Manage Proof Files) - Complete - Provides proof_files table, version tracking
- **Story 18.3** (Track Production Workflow Stages) - Complete - Provides workflow_stage transitions
- **Story 18.2** (Assign Production Tasks to Vendors) - Complete - Provides task-email-service patterns for vendor notifications
- **Epic 6** (Audit Logging) - Complete - Provides audit_logs for proof approval/rejection operations

### FRs Covered
- **FR165:** Publisher can approve or request corrections on proofs

## Acceptance Criteria

### AC1: Approve Proof
- **Given** I am viewing a production project with at least one proof file
- **When** I click "Approve Proof" on the latest proof version
- **Then** the project's workflow_stage changes from "proof" to "print_ready"
- **And** the stage transition is recorded in workflow_stage_history
- **And** the approval is logged to audit_logs with timestamp and user
- **And** a success toast notification is shown

### AC2: Request Corrections
- **Given** I am viewing a production project with at least one proof file
- **When** I click "Request Corrections"
- **Then** I am prompted to enter correction notes (required, minimum 10 characters)
- **And** the project stays in "proof" stage
- **And** the correction request is logged to audit_logs with notes

### AC3: Vendor Email Notification on Corrections
- **Given** I have requested corrections on a proof
- **When** the correction request is submitted
- **Then** an email is sent to the vendor assigned to proofing tasks
- **And** the email includes the correction notes, project title, and publisher info
- **And** if no vendor is assigned, the action still succeeds but no email is sent (with warning toast)

### AC4: Proof Approval History
- **Given** a proof has been approved or corrections requested
- **When** I view the proof version list
- **Then** I can see the approval status on each proof version (approved, corrections_requested, pending)
- **And** I can see the notes from correction requests

### AC5: Approval UI Integration
- **Given** I am viewing the proof section in project detail
- **When** at least one proof file exists
- **Then** I see "Approve Proof" and "Request Corrections" action buttons
- **And** the buttons are disabled if project is not in "proof" stage
- **And** a tooltip explains why if buttons are disabled

### AC6: Audit Logging
- **Given** any proof approval or correction request
- **Then** the operation is logged to audit_logs table
- **And** includes: action_type (PROOF_APPROVED or PROOF_CORRECTIONS_REQUESTED), user, timestamp, proof version, and notes

## Tasks

- [x] Task 1: Extend proof_files schema for approval status (AC: 4)
  - [x] 1.1: Add `approval_status` enum column to proof_files (pending, approved, corrections_requested)
  - [x] 1.2: Add `approval_notes` text column for correction notes
  - [x] 1.3: Add `approved_at` timestamp column
  - [x] 1.4: Add `approved_by` uuid column (FK to users)
  - [x] 1.5: Generate and run migration with `pnpm drizzle-kit generate && pnpm drizzle-kit push`
  - [x] 1.6: Update `src/db/schema/proof-files.ts` with new columns

- [x] Task 2: Create Zod schemas and types (AC: 1, 2)
  - [x] 2.1: Add `approveProofSchema` to `src/modules/production/schema.ts`
  - [x] 2.2: Add `requestCorrectionsSchema` with required notes field (min 10 chars, max 2000)
  - [x] 2.3: Add `ProofApprovalStatus` type to `schema.ts`
  - [x] 2.4: Extend `ProofFileWithUrl` type with approval fields

- [x] Task 3: Create server actions for proof approval (AC: 1, 2, 6)
  - [x] 3.1: Add `approveProof(proofId)` action in `actions.ts`
    - Validates project is in "proof" stage
    - Updates proof approval_status to "approved"
    - Transitions project workflow_stage from "proof" to "print_ready"
    - Updates workflow_stage_history
    - Logs to audit_logs
  - [x] 3.2: Add `requestProofCorrections(proofId, notes)` action
    - Validates project is in "proof" stage
    - Updates proof approval_status to "corrections_requested"
    - Stores correction notes
    - Project stays in "proof" stage
    - Logs to audit_logs
  - [x] 3.3: Integrate audit logging with action_type: "UPDATE" resourceType: "proof_file"

- [x] Task 4: Create vendor notification email for corrections (AC: 3)
  - [x] 4.1: Create `proof-correction-email.tsx` React Email template
  - [x] 4.2: Add `sendProofCorrectionEmail` function in `proof-email-service.ts`
  - [x] 4.3: Find vendor with any task assignment for the project
  - [x] 4.4: Include correction notes, project title, publisher name in email

- [x] Task 5: Update queries for approval status (AC: 4)
  - [x] 5.1: Update `getProofFiles` to include approval_status, approval_notes, approved_at
  - [x] 5.2: Update `getLatestProof` to include approval fields
  - [x] 5.3: Extend `ProofFileWithUrl` interface with approval fields

- [x] Task 6: Build UI components (AC: 1, 2, 5)
  - [x] 6.1: Create `proof-approval-actions.tsx` component with Approve/Request Corrections buttons
  - [x] 6.2: Integrated correction notes dialog into proof-approval-actions.tsx
  - [x] 6.3: Update `proof-version-list.tsx` to show approval status badges
  - [x] 6.4: Integrate approval actions into `proof-section.tsx`
  - [x] 6.5: Disable buttons with tooltip when not in proof stage

- [x] Task 7: Write tests (AC: all)
  - [x] 7.1: Unit tests for approval schema validation
  - [x] 7.2: Unit tests for correction notes required validation
  - [x] 7.3: Test approval status enum values

## Dev Notes

### Database Schema Changes

Extend `src/db/schema/proof-files.ts`:

```typescript
// Add approval status enum
export const proofApprovalStatusEnum = pgEnum("proof_approval_status", [
  "pending",
  "approved",
  "corrections_requested",
]);

// Add to proofFiles table:
/** Approval status for this proof version */
approvalStatus: proofApprovalStatusEnum("approval_status")
  .default("pending")
  .notNull(),

/** Notes from correction request */
approvalNotes: text("approval_notes"),

/** When proof was approved or corrections requested */
approvedAt: timestamp("approved_at", { withTimezone: true }),

/** User who approved or requested corrections */
approvedBy: uuid("approved_by").references(() => users.id, {
  onDelete: "set null",
}),
```

### Zod Schema for Corrections

```typescript
// Add to schema.ts - note minimum 10 chars for meaningful feedback
export const requestCorrectionsSchema = z.object({
  proofId: z.string().uuid("Invalid proof ID"),
  notes: z
    .string()
    .min(10, "Correction notes must be at least 10 characters")
    .max(2000, "Notes too long"),
});
```

### Server Action Pattern

**IMPORTANT:** An `updateWorkflowStage(projectId, newStage)` action already exists at `actions.ts:860`. The `approveProof` action should follow its pattern for stage transitions.

```typescript
// approveProof action pattern
export async function approveProof(proofId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  // Get proof and verify tenant
  const proof = await adminDb.query.proofFiles.findFirst({
    where: and(
      eq(proofFiles.id, proofId),
      eq(proofFiles.tenantId, user.tenant_id),
      isNull(proofFiles.deletedAt)
    ),
  });

  if (!proof) return { success: false, message: "Proof not found" };

  // Get project and verify it's in proof stage
  const project = await adminDb.query.productionProjects.findFirst({
    where: eq(productionProjects.id, proof.projectId),
  });

  if (project.workflowStage !== "proof") {
    return { success: false, message: "Project must be in proof stage to approve" };
  }

  // Update proof approval status
  await db
    .update(proofFiles)
    .set({
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedBy: user.id,
    })
    .where(eq(proofFiles.id, proofId));

  // Transition project to print_ready
  const newHistory = [...(project.workflowStageHistory || []), {
    stage: "print_ready",
    timestamp: new Date().toISOString(),
    userId: user.id,
    notes: `Proof v${proof.version} approved`,
  }];

  await db
    .update(productionProjects)
    .set({
      workflowStage: "print_ready",
      stageEnteredAt: new Date(),
      workflowStageHistory: newHistory,
    })
    .where(eq(productionProjects.id, proof.projectId));

  // Audit log
  logAuditEvent({
    tenantId: user.tenant_id,
    userId: user.id,
    actionType: "UPDATE",
    resourceType: "proof_file",
    resourceId: proofId,
    changes: {
      before: { approvalStatus: "pending", workflowStage: "proof" },
      after: { approvalStatus: "approved", workflowStage: "print_ready" },
    },
  });

  revalidatePath(`/production/${proof.projectId}`);
  return { success: true };
}
```

### Correction Request Email Template

Follow pattern from `task-assignment-email.tsx`. Required imports from `@react-email/components`:

```typescript
// correction-request-email.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";

export interface CorrectionRequestEmailProps {
  vendorName: string;
  projectTitle: string;
  publisherName: string;
  proofVersion: number;
  correctionNotes: string;
}

export function CorrectionRequestEmailTemplate({
  vendorName,
  projectTitle,
  publisherName,
  proofVersion,
  correctionNotes,
}: CorrectionRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Corrections requested for {projectTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Proof Corrections Requested</Heading>
          <Text style={paragraph}>Hello {vendorName},</Text>
          <Text style={paragraph}>
            Corrections have been requested for proof version {proofVersion} of "{projectTitle}".
          </Text>
          <Section style={notesSection}>
            <Text style={notesTitle}>Correction Notes:</Text>
            <Text style={notesText}>{correctionNotes}</Text>
          </Section>
          <Text style={paragraph}>
            Please review and submit a revised proof.
          </Text>
          <Hr style={hr} />
          <Text style={footerText}>— {publisherName}</Text>
        </Container>
      </Body>
    </Html>
  );
}

// REQUIRED: Render function for email service
export async function renderCorrectionRequestEmail(
  props: CorrectionRequestEmailProps,
): Promise<string> {
  return await render(<CorrectionRequestEmailTemplate {...props} />);
}

export function generateCorrectionEmailSubject(
  projectTitle: string,
  proofVersion: number,
): string {
  return `Proof Corrections Requested: ${projectTitle} v${proofVersion}`;
}

// Copy styles from task-assignment-email.tsx (main, container, heading, paragraph, etc.)
```

### Finding Proofing Vendor

Query pattern to find vendor assigned to proofing tasks:

```typescript
// Find vendor with proofing task for this project
const proofingTask = await adminDb.query.productionTasks.findFirst({
  where: and(
    eq(productionTasks.projectId, projectId),
    eq(productionTasks.taskType, "proofing"),
    isNotNull(productionTasks.vendorId),
    isNull(productionTasks.deletedAt)
  ),
});

if (proofingTask?.vendorId) {
  const vendor = await adminDb.query.contacts.findFirst({
    where: eq(contacts.id, proofingTask.vendorId),
  });
  // Send email to vendor.email
}
```

### Email Service Pattern

Follow the `TaskEmailResult` pattern from `task-email-service.ts`:

```typescript
// Add to correction-email-service.ts or extend task-email-service.ts
export interface CorrectionEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendCorrectionRequestEmail(
  params: SendCorrectionEmailParams,
): Promise<CorrectionEmailResult> {
  try {
    // 1. Fetch proofing vendor (see pattern above)
    // 2. Fetch project and title for context
    // 3. Fetch tenant for publisher name
    // 4. Render email with renderCorrectionRequestEmail()
    // 5. Send via sendEmail() from @/lib/email
    // 6. Return result with messageId or error
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### UI Component Pattern

```typescript
// proof-approval-actions.tsx
interface ProofApprovalActionsProps {
  projectId: string;
  latestProofId: string | null;
  workflowStage: string;
  onActionComplete: () => void;
}

export function ProofApprovalActions({
  projectId,
  latestProofId,
  workflowStage,
  onActionComplete,
}: ProofApprovalActionsProps) {
  const [showCorrectionsDialog, setShowCorrectionsDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isProofStage = workflowStage === "proof";
  const canTakeAction = isProofStage && latestProofId;

  const handleApprove = async () => {
    if (!latestProofId) return;
    setIsApproving(true);
    const result = await approveProof(latestProofId);
    if (result.success) {
      toast.success("Proof approved! Project moved to print-ready stage.");
      onActionComplete();
    } else {
      toast.error(result.message || "Failed to approve proof");
    }
    setIsApproving(false);
  };

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                onClick={handleApprove}
                disabled={!canTakeAction || isApproving}
                variant="default"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Proof
              </Button>
            </span>
          </TooltipTrigger>
          {!canTakeAction && (
            <TooltipContent>
              {!latestProofId
                ? "Upload a proof first"
                : "Project must be in proof stage"}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <Button
        onClick={() => setShowCorrectionsDialog(true)}
        disabled={!canTakeAction}
        variant="outline"
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        Request Corrections
      </Button>

      <CorrectionNotesDialog
        open={showCorrectionsDialog}
        onOpenChange={setShowCorrectionsDialog}
        proofId={latestProofId}
        onSuccess={onActionComplete}
      />
    </div>
  );
}
```

### Approval Status Badge

**Note:** The shadcn Badge component uses "default", "secondary", "destructive", "outline" variants. For custom colors, use className with Tailwind:

```typescript
// Add to proof-version-list.tsx
function ApprovalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Approved
        </Badge>
      );
    case "corrections_requested":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Corrections Requested
        </Badge>
      );
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}
```

### Project Structure

```
src/modules/production/
├── actions.ts                     # Add approveProof, requestProofCorrections
├── queries.ts                     # Update with approval fields
├── schema.ts                      # Add approval schemas
├── types.ts                       # Add ProofApprovalStatus type
├── correction-request-email.tsx   # NEW: Email template
└── components/
    ├── proof-approval-actions.tsx # NEW: Approve/Corrections buttons
    ├── correction-notes-dialog.tsx # NEW: Correction notes input
    └── proof-version-list.tsx     # Update with approval badges

src/db/schema/
└── proof-files.ts                 # Add approval columns
```

### Testing Requirements

**Unit Tests (`tests/unit/proof-approval.test.ts`):**
- `approveProofSchema` validation
- `requestCorrectionsSchema` requires notes (min 10 chars)
- `proofApprovalStatusEnum` values: pending, approved, corrections_requested
- Workflow stage validation (must be "proof" to approve)

### Audit Log Resource Type

Ensure `src/db/schema/audit-logs.ts` includes "proof_file" in resource types (already added in Story 18.4).

### References

- [Source: docs/epics.md - Story 18.5 requirements, FR165]
- [Source: docs/architecture.md - Email patterns with Resend + React Email]
- [Source: src/modules/production/task-email-service.ts - Email sending pattern]
- [Source: src/db/schema/proof-files.ts - Existing proof files schema]
- [Source: src/db/schema/production-projects.ts - Workflow stage enum and history]
- [Source: Story 18.4 - Proof file patterns and learnings]

### Previous Story Intelligence

From Story 18.4 implementation:
- Proof files use soft delete with deletedAt timestamp
- Version numbers are strictly incrementing (never reused)
- FormData field names must match between client and server action
- Use `users.email` for uploader name (not first_name/last_name)
- Audit logging uses "proof_file" resource type
- Use `adminDb` for reads, `db` for writes

**Anti-Pattern Prevention:**
- DO NOT allow approval if project is not in "proof" stage
- DO NOT send email if no proofing vendor is assigned (show warning instead)
- DO NOT skip audit logging for approval/correction actions
- DO NOT make correction notes optional - they're required for context
- DO NOT use npm - this project uses pnpm

### Git Intelligence

Recent commits show:
- Story 18.4 (3c7efc7) established proof file patterns
- Production module has email service patterns from Story 18.2
- Workflow stage transitions pattern from Story 18.3
- Consistent use of React Email templates with Resend

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript error with WorkflowStageHistoryEntry type - fixed by using `from`/`to` properties instead of `stage`
- Users table doesn't have first_name/last_name - used email prefix for requester name in emails

### Completion Notes List

- All 6 ACs implemented and verified
- Database migration generated (0014_wooden_dazzler.sql) and applied via drizzle-kit push
- Email notification integrates with existing Resend + React Email pattern
- Unit tests added for schema validation (27 tests passing)
- Pre-existing test failures in production-storage.test.ts (formatFileSize) are unrelated to this story

### File List

**New Files:**
- `src/db/schema/proof-files.ts` - Extended with approval status enum and columns
- `src/modules/production/proof-correction-email.tsx` - React Email template for corrections
- `src/modules/production/proof-email-service.ts` - Email service for proof corrections
- `src/modules/production/components/proof-approval-actions.tsx` - Approve/Corrections buttons
- `drizzle/migrations/0014_wooden_dazzler.sql` - Migration for approval columns
- `tests/unit/production-proof-approval.test.ts` - Unit tests for approval schemas

**Modified Files:**
- `src/modules/production/schema.ts` - Added PROOF_APPROVAL_STATUSES, approveProofSchema, requestCorrectionsSchema
- `src/modules/production/types.ts` - Extended ProofFileWithUrl with approval fields
- `src/modules/production/actions.ts` - Added approveProof, requestProofCorrections actions
- `src/modules/production/queries.ts` - Updated getProofFiles, getLatestProof with approval fields
- `src/modules/production/components/proof-version-list.tsx` - Added approval status badges
- `src/modules/production/components/proof-section.tsx` - Integrated ProofApprovalActions
- `src/modules/production/components/index.ts` - Exported ProofApprovalActions
