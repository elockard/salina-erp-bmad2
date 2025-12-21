# Story 18.4: Upload and Manage Proof Files

Status: done

## Story

**As a** publisher,
**I want** to upload and manage proof files with version tracking,
**So that** I can track review cycles and maintain a history of all proof iterations.

## Context

Epic 18 (Production Pipeline) manages manuscript-to-print workflow. Story 18.1 established production projects with manuscript uploads. Story 18.2 added task assignment to vendors. Story 18.3 added workflow stages with a Kanban board. This story adds proof file management with versioning, enabling publishers to upload multiple proof iterations (v1, v2, v3, etc.) with notes, download previous versions, and maintain a complete audit trail of the proofing process.

### Dependencies
- **Story 18.1** (Create Production Projects) - Complete - Provides production_projects table, S3 storage patterns
- **Story 18.3** (Track Production Workflow Stages) - Complete - Provides workflow_stage field (project must be in "proof" stage to upload proofs)
- **Epic 6** (Audit Logging) - Complete - Provides audit_logs for proof file operations

### FRs Covered
- **FR164:** Publisher can upload and manage proof files with version tracking

## Acceptance Criteria

### AC1: Upload Proof File
- **Given** I have a production project
- **When** I upload a proof file (PDF only, max 100MB)
- **Then** the proof is saved with version number (v1 for first, v2 for second, etc.)
- **And** I can add notes describing this version (e.g., "Initial layout", "Fixed typos on page 42")
- **And** the upload timestamp and user are recorded
- **And** the file is stored securely in S3 with tenant-scoped path

### AC2: Version History View
- **Given** a production project has proof files
- **When** I view the proofs section in project detail
- **Then** I see a list of all proof versions ordered by version number (newest first)
- **And** each entry shows: version number, upload date, uploader name, file size, notes
- **And** I can see the total number of proof versions

### AC3: Download Proof Files
- **Given** I am viewing the proof version list
- **When** I click download on any version
- **Then** I receive a presigned S3 URL that downloads the original PDF
- **And** the URL expires after 15 minutes for security
- **And** the download filename includes version number (e.g., "MyBook-proof-v3.pdf")

### AC4: Preview Latest Proof
- **Given** a project has at least one proof file
- **When** I view the project detail
- **Then** I can preview the latest proof inline using a PDF viewer
- **And** the viewer shows basic navigation (page up/down, zoom)
- **And** I can expand to full-screen view

### AC5: Edit Proof Notes
- **Given** I am viewing a proof version
- **When** I edit the notes for that version
- **Then** the notes are updated
- **And** the edit is logged to audit trail

### AC6: Delete Proof Version
- **Given** I am an owner/admin
- **When** I delete a proof version
- **Then** the proof is soft-deleted (deletedAt timestamp)
- **And** the S3 file is NOT deleted (retained for compliance)
- **And** the deletion is logged to audit trail
- **And** version numbers of remaining proofs are NOT renumbered

### AC7: Proof Upload Restriction by Stage (Optional Enhancement)
- **Given** a production project exists
- **When** the workflow_stage is "proof"
- **Then** a visual indicator encourages uploading proofs
- **Note:** Proofs can be uploaded at any stage for flexibility, but the UI should highlight when in proof stage

### AC8: Audit Logging
- **Given** any proof file operation (upload, edit notes, delete)
- **Then** the operation is logged to audit_logs table
- **And** includes user, timestamp, and before/after values

## Tasks

- [x] Task 1: Create database schema for proof_files (AC: 1, 2)
  - [x] 1.1: Create `src/db/schema/proof-files.ts` with table definition
  - [x] 1.2: Add version (integer), notes (text), file metadata columns
  - [x] 1.3: Add foreign key to production_projects
  - [x] 1.4: Add tenantId for RLS consistency
  - [x] 1.5: Run `npx drizzle-kit generate` and `npx drizzle-kit migrate`
  - [x] 1.6: Update `src/db/schema/index.ts` and `relations.ts`

- [x] Task 2: Extend S3 storage for proof uploads (AC: 1, 3)
  - [x] 2.1: Add proof file constants to `src/modules/production/storage.ts`
  - [x] 2.2: Add `uploadProofFile` function (PDF only, max 100MB)
  - [x] 2.3: Add `getProofDownloadUrl` function with filename override
  - [x] 2.4: Add `validateProofFile` function

- [x] Task 3: Create Zod schemas and types (AC: 1, 5)
  - [x] 3.1: Add proof file schemas to `src/modules/production/schema.ts`
  - [x] 3.2: Add proof file types to `src/modules/production/types.ts`

- [x] Task 4: Create server actions for proofs (AC: 1, 5, 6, 8)
  - [x] 4.1: Add `uploadProofFile` action with auto-versioning
  - [x] 4.2: Add `updateProofNotes` action
  - [x] 4.3: Add `deleteProofFile` action (soft delete)
  - [x] 4.4: Integrate audit logging for all actions

- [x] Task 5: Create queries for proofs (AC: 2, 3, 4)
  - [x] 5.1: Add `getProofFiles(projectId)` query with presigned URLs
  - [x] 5.2: Add `getLatestProof(projectId)` query for preview
  - [x] 5.3: Add `getProofFileSummary(projectId)` query

- [x] Task 6: Build UI components (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 6.1: Create `proof-upload-form.tsx` with drag-drop zone
  - [x] 6.2: Create `proof-version-list.tsx` with version history
  - [x] 6.3: Create `proof-preview.tsx` with PDF viewer
  - [x] 6.4: Integrate proof components into production-project-detail.tsx
  - [x] 6.5: Add visual indicator when project is in "proof" stage

- [x] Task 7: Write tests (AC: all)
  - [x] 7.1: Unit tests for proof file schema validation
  - [x] 7.2: Unit tests for version number calculation
  - [x] 7.3: Unit tests for file type/size validation
  - [ ] 7.4: Action tests (deferred - requires auth mocking)

## Dev Notes

### Database Schema

Create `src/db/schema/proof-files.ts`:

```typescript
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productionProjects } from "./production-projects";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Proof Files table
 * AC-18.4.1: Upload proof file with version tracking
 * AC-18.4.2: Version history with notes
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 */
export const proofFiles = pgTable(
  "proof_files",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Foreign key to production_projects */
    projectId: uuid("project_id")
      .notNull()
      .references(() => productionProjects.id, { onDelete: "cascade" }),

    /** Version number (1, 2, 3, etc.) - auto-incremented per project */
    version: integer("version").notNull(),

    /** S3 object key for the proof file */
    fileKey: text("file_key").notNull(),

    /** Original filename */
    fileName: varchar("file_name", { length: 255 }).notNull(),

    /** File size in bytes */
    fileSize: text("file_size").notNull(),

    /** MIME type (should be application/pdf) */
    mimeType: varchar("mime_type", { length: 100 }).notNull(),

    /** Notes describing this version (e.g., "Fixed typos on page 42") */
    notes: text("notes"),

    /** Upload timestamp */
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** User who uploaded this version */
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    /** Soft delete timestamp */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    /** User who deleted this version */
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    /** Index on tenant_id for RLS and filtering */
    tenantIdIdx: index("proof_files_tenant_id_idx").on(table.tenantId),

    /** Index on project_id for lookups */
    projectIdIdx: index("proof_files_project_id_idx").on(table.projectId),

    /** Composite index for version lookup within project */
    projectVersionIdx: index("proof_files_project_version_idx").on(
      table.projectId,
      table.version
    ),
  })
);

export type ProofFile = typeof proofFiles.$inferSelect;
export type ProofFileInsert = typeof proofFiles.$inferInsert;
```

**CRITICAL:** Update `src/db/schema/relations.ts`:

```typescript
// 1. Add import at top of file:
import { proofFiles } from "./proof-files";

// 2. Add proofFilesRelations definition:
/**
 * Proof Files relations
 * Each proof file belongs to one tenant, one project, and one user (uploader)
 * Story 18.4: Upload and Manage Proof Files
 *
 * Soft delete pattern: Query with isNull(deletedAt) filter
 */
export const proofFilesRelations = relations(proofFiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [proofFiles.tenantId],
    references: [tenants.id],
  }),
  project: one(productionProjects, {
    fields: [proofFiles.projectId],
    references: [productionProjects.id],
  }),
  uploadedByUser: one(users, {
    fields: [proofFiles.uploadedBy],
    references: [users.id],
    relationName: "proofFileUploadedBy",
  }),
  deletedByUser: one(users, {
    fields: [proofFiles.deletedBy],
    references: [users.id],
    relationName: "proofFileDeletedBy",
  }),
}));

// 3. Update productionProjectsRelations to add proofFiles relation:
// Find the existing productionProjectsRelations and add:
/**
 * Proof Files - proof versions for this project
 * Story 18.4: Upload and Manage Proof Files
 */
proofFiles: many(proofFiles),
```

**CRITICAL:** Update `src/db/schema/index.ts`:

```typescript
// 1. Add export at top with other exports:
export * from "./proof-files";

// 2. Add type import and export at bottom with other types:
import type { proofFiles } from "./proof-files";
export type ProofFile = typeof proofFiles.$inferSelect;
```

### Storage Additions (`src/modules/production/storage.ts`)

Add to existing storage.ts file:

```typescript
/**
 * Maximum proof file size (100MB)
 * AC-18.4.1: PDF files up to 100MB
 */
export const PROOF_MAX_SIZE = 100 * 1024 * 1024;

/**
 * Allowed proof MIME types (PDF only)
 * AC-18.4.1: PDF only for proofs
 */
export const PROOF_ALLOWED_TYPES = ["application/pdf"];

/**
 * Allowed proof file extensions
 */
export const PROOF_ALLOWED_EXTENSIONS = [".pdf"];

/**
 * Validate proof file
 *
 * @param file - File to validate
 * @throws Error if file is invalid
 */
export function validateProofFile(file: File): void {
  if (!PROOF_ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PDF files are allowed for proofs");
  }

  if (file.size > PROOF_MAX_SIZE) {
    throw new Error("File too large. Maximum size for proofs is 100MB");
  }
}

/**
 * Generate S3 key for proof file
 * Pattern: production/{tenant_id}/{project_id}/proofs/v{version}-{timestamp}-{filename}
 *
 * @param tenantId - Tenant UUID
 * @param projectId - Production project UUID
 * @param version - Version number
 * @param fileName - Original filename
 * @returns S3 object key
 */
export function generateProofS3Key(
  tenantId: string,
  projectId: string,
  version: number,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `production/${tenantId}/${projectId}/proofs/v${version}-${timestamp}-${sanitizedName}`;
}

/**
 * Upload proof file to S3
 *
 * @param buffer - File content as Buffer
 * @param tenantId - Tenant UUID
 * @param projectId - Production project UUID
 * @param version - Version number
 * @param fileName - Original filename
 * @param contentType - MIME type
 * @returns Object with S3 key, filename, and size
 */
export async function uploadProofFile(
  buffer: Buffer,
  tenantId: string,
  projectId: string,
  version: number,
  fileName: string,
  contentType: string
): Promise<{ key: string; fileName: string; fileSize: number }> {
  const s3Key = generateProofS3Key(tenantId, projectId, version, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      "tenant-id": tenantId,
      "project-id": projectId,
      "version": String(version),
      "original-name": fileName,
      "uploaded-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return {
      key: s3Key,
      fileName,
      fileSize: buffer.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(
      `[S3] Proof upload failed for project ${projectId} v${version}:`,
      message
    );
    throw new Error(`Failed to upload proof to S3: ${message}`);
  }
}

/**
 * Generate presigned download URL for proof file with custom filename
 *
 * @param s3Key - S3 object key
 * @param downloadFileName - Filename for Content-Disposition header
 * @returns Presigned URL valid for 15 minutes
 */
export async function getProofDownloadUrl(
  s3Key: string,
  downloadFileName: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${downloadFileName}"`,
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });
    return url;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown presigned URL error";
    console.error(
      `[S3] Presigned URL generation failed for ${s3Key}:`,
      message
    );
    throw new Error(`Failed to generate download URL: ${message}`);
  }
}
```

### Schema Additions (`src/modules/production/schema.ts`)

Add to existing schema.ts file:

```typescript
// ============================================================================
// Proof File Schemas (Story 18.4)
// ============================================================================

/**
 * Upload proof file schema
 * AC-18.4.1: Upload proof with optional notes
 */
export const uploadProofFileSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

export type UploadProofFileInput = z.infer<typeof uploadProofFileSchema>;

/**
 * Update proof notes schema
 * AC-18.4.5: Edit notes for a proof version
 */
export const updateProofNotesSchema = z.object({
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

export type UpdateProofNotesInput = z.infer<typeof updateProofNotesSchema>;
```

### Type Additions (`src/modules/production/types.ts`)

Add to existing types.ts file:

```typescript
// CRITICAL: Update ActionResult interface to include version field
// Add this field if not already present:
export interface ActionResult {
  success: boolean;
  id?: string;
  message?: string;
  emailSent?: boolean;
  version?: number;  // Added for proof file uploads
}

/**
 * Proof file with download URL
 * AC-18.4.2, AC-18.4.3: Version history with download capability
 */
export interface ProofFileWithUrl {
  id: string;
  version: number;
  fileName: string;
  fileSize: string;
  mimeType: string;
  notes: string | null;
  uploadedAt: Date;
  uploadedBy: string;
  uploaderName: string;
  downloadUrl: string;
}

/**
 * Proof file summary for list view
 */
export interface ProofFileSummary {
  totalVersions: number;
  latestVersion: number | null;
  latestUploadedAt: Date | null;
}
```

### Server Action Pattern (`src/modules/production/actions.ts`)

Add to existing actions.ts file:

```typescript
// CRITICAL: Add these imports at top of actions.ts
import { proofFiles } from "@/db/schema/proof-files";
import { and, eq, isNull, max } from "drizzle-orm";  // Add max to existing imports
import {
  uploadProofFile as uploadProofToS3,
  validateProofFile,
} from "./storage";
import { uploadProofFileSchema, updateProofNotesSchema } from "./schema";

// =============================================================================
// Proof File Actions (Story 18.4)
// =============================================================================

/**
 * Upload proof file with auto-versioning
 * AC-18.4.1: Upload proof file with version number
 * AC-18.4.8: Audit log on upload
 */
export async function uploadProofFile(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Parse form data
    const input = {
      projectId: formData.get("projectId") as string,
      notes: (formData.get("notes") as string) || null,
    };

    // Validate input
    const validation = uploadProofFileSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get file from form data
    const file = formData.get("proofFile") as File;
    if (!file || file.size === 0) {
      return { success: false, message: "No file provided" };
    }

    // Validate file type and size
    try {
      validateProofFile(file);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Invalid file",
      };
    }

    // Verify project exists and belongs to tenant
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

    // Calculate next version number
    // CRITICAL: Do NOT filter by deletedAt - versions must be strictly incrementing
    // If v1, v2, v3 exist and v2 is deleted, next upload must be v4, not v3
    const maxVersionResult = await adminDb
      .select({ maxVersion: max(proofFiles.version) })
      .from(proofFiles)
      .where(eq(proofFiles.projectId, input.projectId));

    const nextVersion = (maxVersionResult[0]?.maxVersion ?? 0) + 1;

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadProofToS3(
      buffer,
      user.tenant_id,
      input.projectId,
      nextVersion,
      file.name,
      file.type
    );

    // Create proof file record
    const [proofFile] = await db
      .insert(proofFiles)
      .values({
        tenantId: user.tenant_id,
        projectId: input.projectId,
        version: nextVersion,
        fileKey: uploadResult.key,
        fileName: uploadResult.fileName,
        fileSize: String(uploadResult.fileSize),
        mimeType: file.type,
        notes: input.notes,
        uploadedBy: user.id,
      })
      .returning();

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "proof_file",
      resourceId: proofFile.id,
      changes: {
        after: {
          projectId: input.projectId,
          version: nextVersion,
          fileName: file.name,
          fileSize: uploadResult.fileSize,
        },
      },
    });

    revalidatePath("/production");
    revalidatePath(`/production/${input.projectId}`);
    return { success: true, id: proofFile.id, version: nextVersion };
  } catch (error) {
    console.error("[Production] Upload proof failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to upload proof",
    };
  }
}

/**
 * Update proof file notes
 * AC-18.4.5: Edit notes for a proof version
 * AC-18.4.8: Audit log on update
 */
export async function updateProofNotes(
  proofId: string,
  notes: string | null
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Validate input
    const validation = updateProofNotesSchema.safeParse({ notes });
    if (!validation.success) {
      return { success: false, message: validation.error.message };
    }

    // Get existing proof file
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt)
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof file not found" };
    }

    const previousNotes = proof.notes;

    // Update notes
    await db
      .update(proofFiles)
      .set({ notes })
      .where(eq(proofFiles.id, proofId));

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: { notes: previousNotes },
        after: { notes },
      },
    });

    revalidatePath(`/production/${proof.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Update proof notes failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update notes",
    };
  }
}

/**
 * Delete proof file (soft delete)
 * AC-18.4.6: Soft delete, retain S3 file, log to audit
 */
export async function deleteProofFile(proofId: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Only owner/admin can delete
    if (!["owner", "admin"].includes(user.role)) {
      return { success: false, message: "Only admins can delete proof files" };
    }

    // Get existing proof file
    const proof = await adminDb.query.proofFiles.findFirst({
      where: and(
        eq(proofFiles.id, proofId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt)
      ),
    });

    if (!proof) {
      return { success: false, message: "Proof file not found" };
    }

    // Soft delete (AC-18.4.6: S3 file is NOT deleted for compliance)
    await db
      .update(proofFiles)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(proofFiles.id, proofId));

    // Audit log (AC-18.4.8)
    logAuditEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "proof_file",
      resourceId: proofId,
      changes: {
        before: {
          version: proof.version,
          fileName: proof.fileName,
          projectId: proof.projectId,
        },
      },
    });

    revalidatePath(`/production/${proof.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("[Production] Delete proof failed:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete proof",
    };
  }
}
```

### Query Pattern (`src/modules/production/queries.ts`)

Add to existing queries.ts file:

```typescript
import { proofFiles } from "@/db/schema/proof-files";
import { getProofDownloadUrl } from "./storage";
import type { ProofFileWithUrl, ProofFileSummary } from "./types";

/**
 * Get all proof files for a project with download URLs
 * AC-18.4.2, AC-18.4.3: Version history with download capability
 */
export async function getProofFiles(
  projectId: string
): Promise<ProofFileWithUrl[]> {
  const user = await getAuthenticatedUser();

  const proofs = await adminDb
    .select({
      id: proofFiles.id,
      version: proofFiles.version,
      fileName: proofFiles.fileName,
      fileSize: proofFiles.fileSize,
      mimeType: proofFiles.mimeType,
      fileKey: proofFiles.fileKey,
      notes: proofFiles.notes,
      uploadedAt: proofFiles.uploadedAt,
      uploadedBy: proofFiles.uploadedBy,
      uploaderFirstName: users.first_name,
      uploaderLastName: users.last_name,
    })
    .from(proofFiles)
    .innerJoin(users, eq(proofFiles.uploadedBy, users.id))
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt)
      )
    )
    .orderBy(desc(proofFiles.version));

  // O1: Generate download URLs with custom filenames
  // Using Promise.all for parallel generation (optimized for up to ~20 proofs)
  // For very large lists, consider pagination or lazy loading URLs on demand
  const results: ProofFileWithUrl[] = await Promise.all(
    proofs.map(async (proof) => {
      // Generate download filename: {title}-proof-v{version}.pdf
      const baseName = proof.fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      const downloadFileName = `${baseName}-v${proof.version}.pdf`;

      const downloadUrl = await getProofDownloadUrl(
        proof.fileKey,
        downloadFileName
      );

      return {
        id: proof.id,
        version: proof.version,
        fileName: proof.fileName,
        fileSize: proof.fileSize,
        mimeType: proof.mimeType,
        notes: proof.notes,
        uploadedAt: proof.uploadedAt,
        uploadedBy: proof.uploadedBy,
        uploaderName: `${proof.uploaderFirstName} ${proof.uploaderLastName}`,
        downloadUrl,
      };
    })
  );

  return results;
}

/**
 * Get latest proof file for preview
 * AC-18.4.4: Preview latest proof inline
 */
export async function getLatestProof(
  projectId: string
): Promise<ProofFileWithUrl | null> {
  const user = await getAuthenticatedUser();

  const proof = await adminDb
    .select({
      id: proofFiles.id,
      version: proofFiles.version,
      fileName: proofFiles.fileName,
      fileSize: proofFiles.fileSize,
      mimeType: proofFiles.mimeType,
      fileKey: proofFiles.fileKey,
      notes: proofFiles.notes,
      uploadedAt: proofFiles.uploadedAt,
      uploadedBy: proofFiles.uploadedBy,
      uploaderFirstName: users.first_name,
      uploaderLastName: users.last_name,
    })
    .from(proofFiles)
    .innerJoin(users, eq(proofFiles.uploadedBy, users.id))
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt)
      )
    )
    .orderBy(desc(proofFiles.version))
    .limit(1);

  if (proof.length === 0) {
    return null;
  }

  const p = proof[0];
  const downloadUrl = await getProofDownloadUrl(
    p.fileKey,
    `${p.fileName.replace(/\.[^/.]+$/, "")}-v${p.version}.pdf`
  );

  return {
    id: p.id,
    version: p.version,
    fileName: p.fileName,
    fileSize: p.fileSize,
    mimeType: p.mimeType,
    notes: p.notes,
    uploadedAt: p.uploadedAt,
    uploadedBy: p.uploadedBy,
    uploaderName: `${p.uploaderFirstName} ${p.uploaderLastName}`,
    downloadUrl,
  };
}

/**
 * Get proof file summary for project
 */
export async function getProofFileSummary(
  projectId: string
): Promise<ProofFileSummary> {
  const user = await getAuthenticatedUser();

  const result = await adminDb
    .select({
      totalVersions: sql<number>`count(*)::int`,
      latestVersion: max(proofFiles.version),
      latestUploadedAt: max(proofFiles.uploadedAt),
    })
    .from(proofFiles)
    .where(
      and(
        eq(proofFiles.projectId, projectId),
        eq(proofFiles.tenantId, user.tenant_id),
        isNull(proofFiles.deletedAt)
      )
    );

  return {
    totalVersions: result[0]?.totalVersions ?? 0,
    latestVersion: result[0]?.latestVersion ?? null,
    latestUploadedAt: result[0]?.latestUploadedAt ?? null,
  };
}
```

### UI Component Pattern: Proof Upload Form

```typescript
// src/modules/production/components/proof-upload-form.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";  // O2: Import FileRejection type
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadProofFile } from "../actions";
import { formatFileSize, PROOF_MAX_SIZE } from "../storage";

interface ProofUploadFormProps {
  projectId: string;
  onSuccess?: (version: number) => void;
}

export function ProofUploadForm({ projectId, onSuccess }: ProofUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // O2: Client-side validation before upload (immediate feedback)
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Handle rejected files (from dropzone's built-in validation)
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((e) => e.code === "file-too-large")) {
        toast.error("File too large. Maximum size is 100MB");
      } else if (rejection.errors.some((e) => e.code === "file-invalid-type")) {
        toast.error("Only PDF files are allowed for proofs");
      } else {
        toast.error("Invalid file");
      }
      return;
    }

    // Handle accepted files
    const pdfFile = acceptedFiles.find((f) => f.type === "application/pdf");
    if (pdfFile) {
      // Double-check size (belt and suspenders)
      if (pdfFile.size > PROOF_MAX_SIZE) {
        toast.error("File too large. Maximum size is 100MB");
        return;
      }
      setFile(pdfFile);
    } else {
      toast.error("Only PDF files are allowed for proofs");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: PROOF_MAX_SIZE,
    multiple: false,
  });

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("proofFile", file);
      if (notes) {
        formData.append("notes", notes);
      }

      const result = await uploadProofFile(formData);

      if (result.success) {
        toast.success(`Proof v${result.version} uploaded successfully`);
        setFile(null);
        setNotes("");
        onSuccess?.(result.version as number);
      } else {
        toast.error(result.message || "Failed to upload proof");
      }
    } catch (error) {
      toast.error("Failed to upload proof");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Drop the PDF here..."
                : "Drag & drop a PDF proof, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF only, max 100MB
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Version Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="e.g., Fixed typos on page 42, Updated cover design"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {notes.length}/2000
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!file || isUploading}
        className="w-full"
      >
        {isUploading ? "Uploading..." : "Upload Proof"}
      </Button>
    </div>
  );
}
```

### UI Component Pattern: Proof Version List

```typescript
// src/modules/production/components/proof-version-list.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Edit2, Trash2, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateProofNotes, deleteProofFile } from "../actions";
import { formatFileSize } from "../storage";
import type { ProofFileWithUrl } from "../types";

interface ProofVersionListProps {
  proofs: ProofFileWithUrl[];
  canDelete: boolean;
  onUpdate?: () => void;
  isLoading?: boolean;  // E3: Loading state support
}

export function ProofVersionList({
  proofs,
  canDelete,
  onUpdate,
  isLoading = false,  // E3: Default to not loading
}: ProofVersionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);  // E3: Track save operations
  const [isDeleting, setIsDeleting] = useState<string | null>(null);  // E3: Track which item is being deleted

  const handleEditStart = (proof: ProofFileWithUrl) => {
    setEditingId(proof.id);
    setEditNotes(proof.notes || "");
  };

  const handleEditSave = async (proofId: string) => {
    const result = await updateProofNotes(proofId, editNotes || null);
    if (result.success) {
      toast.success("Notes updated");
      setEditingId(null);
      onUpdate?.();
    } else {
      toast.error(result.message || "Failed to update notes");
    }
  };

  const handleDelete = async (proofId: string) => {
    const result = await deleteProofFile(proofId);
    if (result.success) {
      toast.success("Proof version deleted");
      onUpdate?.();
    } else {
      toast.error(result.message || "Failed to delete proof");
    }
  };

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No proof files uploaded yet</p>
        <p className="text-sm">Upload a proof to start tracking versions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="border rounded-lg p-4 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">v{proof.version}</span>
                  <span className="text-sm text-muted-foreground">
                    {proof.fileName}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(parseInt(proof.fileSize, 10))} &bull;{" "}
                  {format(new Date(proof.uploadedAt), "MMM d, yyyy 'at' h:mm a")} &bull;{" "}
                  {proof.uploaderName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label="Download proof"
              >
                <a href={proof.downloadUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditStart(proof)}
                aria-label="Edit notes"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete proof"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Proof v{proof.version}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove this proof version from the list.
                        The file will be retained for compliance purposes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(proof.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {editingId === proof.id ? (
            <div className="space-y-2">
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this version..."
                maxLength={2000}
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleEditSave(proof.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : proof.notes ? (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
              {proof.notes}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

### UI Component Pattern: Proof Preview

```typescript
// src/modules/production/components/proof-preview.tsx
"use client";

import { useState, useCallback } from "react";
import { Expand, Download, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ProofFileWithUrl } from "../types";

interface ProofPreviewProps {
  proof: ProofFileWithUrl | null;
  projectTitle: string;
  onRefreshUrl?: () => void;  // E2: Callback to refresh expired URL
}

export function ProofPreview({ proof, projectTitle, onRefreshUrl }: ProofPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewError, setPreviewError] = useState(false);  // E2: Track preview errors

  // E2: Handle iframe load error (expired presigned URL)
  const handleIframeError = useCallback(() => {
    setPreviewError(true);
  }, []);

  // E2: Refresh preview after URL refresh
  const handleRefresh = useCallback(() => {
    setPreviewError(false);
    onRefreshUrl?.();
  }, [onRefreshUrl]);

  if (!proof) {
    return (
      <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No Proof Available</p>
        <p className="text-sm">Upload a proof file to preview it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Latest: v{proof.version} - {proof.fileName}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={proof.downloadUrl} download>
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Expand className="h-4 w-4 mr-1" />
                Fullscreen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {projectTitle} - Proof v{proof.version}
                </DialogTitle>
              </DialogHeader>
              <iframe
                src={`${proof.downloadUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded border"
                title={`Proof v${proof.version}`}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* E2: Show refresh button if preview expired */}
      {previewError ? (
        <div className="border rounded-lg p-8 text-center bg-muted/20">
          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">
            Preview link expired. Click to refresh.
          </p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Preview
          </Button>
        </div>
      ) : (
        /* Embedded PDF preview */
        <div className="border rounded-lg overflow-hidden bg-muted/20">
          <iframe
            src={`${proof.downloadUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-[500px]"
            title={`Proof preview v${proof.version}`}
            onError={handleIframeError}
          />
        </div>
      )}

      {proof.notes && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
          <strong>Notes:</strong> {proof.notes}
        </p>
      )}
    </div>
  );
}
```

### Dependencies to Install

```bash
pnpm add react-dropzone
```

**Note:** react-dropzone provides drag-and-drop file upload functionality.

### Project Structure

```
src/modules/production/
├── actions.ts                  # Add proof file actions
├── queries.ts                  # Add proof file queries
├── schema.ts                   # Add proof file schemas
├── types.ts                    # Add proof file types
├── storage.ts                  # Add proof file S3 functions
└── components/
    ├── index.ts                # Export new proof components
    ├── proof-upload-form.tsx   # NEW: Drag-drop upload form
    ├── proof-version-list.tsx  # NEW: Version history list
    └── proof-preview.tsx       # NEW: PDF preview component

src/db/schema/
├── proof-files.ts              # NEW: Proof files table schema
├── index.ts                    # Export proof-files
└── relations.ts                # Add proof file relations

src/app/(dashboard)/production/
└── [id]/
    └── page.tsx                # Integrate proof components
```

### Testing Requirements

**Unit Tests (`tests/unit/proof-files.test.ts`):**
- `uploadProofFileSchema` validation (valid/invalid inputs)
- `updateProofNotesSchema` validation (max length)
- `validateProofFile` returns error for non-PDF
- `validateProofFile` returns error for oversized files
- Version number calculation (next version logic)

**Action Tests (if auth mocking available):**
- Upload creates proof with correct version
- Second upload creates v2
- Update notes works correctly
- Delete performs soft delete
- Audit logs created for all operations

### References

- [Source: docs/epics.md - Story 18.4 requirements, FR164]
- [Source: docs/architecture.md - Production module structure, S3 storage pattern]
- [Source: src/db/schema/production-projects.ts - Schema pattern with tenantId]
- [Source: src/modules/production/storage.ts - S3 upload pattern for manuscripts]
- [Source: src/modules/production/actions.ts - Server action patterns with audit logging]
- [Source: Story 18.3 - Previous story learnings, workflow stage integration]

### Previous Story Intelligence

From Story 18.1, 18.2, 18.3 implementation:
- Use FormData for actions with file uploads
- Use `adminDb` for read queries, `db` for writes
- Soft delete pattern with deletedAt timestamp
- Audit logging with before/after changes
- Always filter by `isNull(deletedAt)` in queries
- Include tenantId in all tables for RLS consistency
- Use revalidatePath after mutations
- Storage utilities in production module (not lib/storage.ts)
- Use existing S3 client singleton from storage.ts

**Anti-Pattern Prevention:**
- DO NOT allow non-PDF files for proofs - validate strictly
- DO NOT delete S3 files on soft delete - retain for compliance
- DO NOT renumber versions after deletion - versions are permanent
- DO NOT skip audit logging for any proof operation
- DO NOT use npm - this project uses pnpm
- DO NOT forget to update schema exports in index.ts and relations.ts

### Git Intelligence

Recent commits show:
- Story 18.3 (846e6ba) established production workflow stages with @dnd-kit
- Production module has established patterns for components, actions, queries
- S3 storage patterns established in storage.ts for manuscripts
- Consistent use of TypeScript, Zod validation, shadcn/ui components

### Audit Log Pattern

**CRITICAL:** Update `src/db/schema/audit-logs.ts` to add "proof_file" to `auditResourceTypeValues` array if not already present:

```typescript
export const auditResourceTypeValues = [
  // ... existing values
  "proof_file",  // <-- ADD THIS LINE if missing
] as const;
```

### Integration with Project Detail

**CRITICAL:** `production-project-detail.tsx` is a `"use client"` component and cannot use async/await directly. Data must be fetched in a Server Component and passed as props.

**Step 1:** Update page.tsx (Server Component) to fetch proof data:

```typescript
// src/app/(dashboard)/production/[id]/page.tsx
import { getProofFiles, getLatestProof } from "@/modules/production/queries";

// In the page component (async Server Component):
const proofs = await getProofFiles(projectId);
const latestProof = await getLatestProof(projectId);

// Pass to detail component:
<ProductionProjectDetail
  project={project}
  availableTitles={availableTitles}
  proofs={proofs}
  latestProof={latestProof}
  userRole={user.role}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>
```

**Step 2:** Update ProductionProjectDetail props interface:

```typescript
// In production-project-detail.tsx
import type { ProofFileWithUrl } from "../types";

interface ProductionProjectDetailProps {
  project: ProductionProjectWithTitle;
  availableTitles: TitleOption[];
  proofs: ProofFileWithUrl[];           // ADD
  latestProof: ProofFileWithUrl | null; // ADD
  userRole: string;                      // ADD
  onUpdate: () => void;
  onDelete: () => void;
}
```

**Step 3:** Add proof section to component:

```typescript
import { ProofUploadForm } from "./proof-upload-form";
import { ProofVersionList } from "./proof-version-list";
import { ProofPreview } from "./proof-preview";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export function ProductionProjectDetail({
  project,
  availableTitles,
  proofs,
  latestProof,
  userRole,
  onUpdate,
  onDelete,
}: ProductionProjectDetailProps) {
  const router = useRouter();

  // Refresh data after proof operations
  const handleProofUpdate = () => {
    router.refresh();
    onUpdate();
  };

  // ... existing code ...

  // Add Proof Files section after Tasks Section:
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Proof Files
        {project.workflowStage === "proof" && (
          <Badge variant="secondary">Current Stage</Badge>
        )}
      </CardTitle>
      <CardDescription>
        {proofs.length} version{proofs.length !== 1 ? "s" : ""} uploaded
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <ProofUploadForm
        projectId={project.id}
        onSuccess={handleProofUpdate}
      />

      {latestProof && (
        <ProofPreview
          proof={latestProof}
          projectTitle={project.titleName}
        />
      )}

      <ProofVersionList
        proofs={proofs}
        canDelete={["owner", "admin"].includes(userRole)}
        onUpdate={handleProofUpdate}
      />
    </CardContent>
  </Card>
}
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None

### Completion Notes List

- Fixed FormData field name mismatch: `proof-upload-form.tsx` was sending "file" but action expected "proofFile"
- Used `users.email` instead of `users.first_name`/`users.last_name` (columns don't exist on users table)
- Added biome-ignore for accessibility on drop zone (accessible via nested input element)

### File List

**New Files:**
- `src/db/schema/proof-files.ts` - Proof files table schema
- `src/modules/production/components/proof-upload-form.tsx` - Drag-drop upload form
- `src/modules/production/components/proof-version-list.tsx` - Version history list
- `src/modules/production/components/proof-preview.tsx` - PDF viewer component
- `src/modules/production/components/proof-section.tsx` - Container component
- `drizzle/migrations/0013_clever_cargill.sql` - Migration for proof_files table
- `drizzle/migrations/meta/0013_snapshot.json` - Migration snapshot
- `tests/unit/production-proof-files.test.ts` - Unit tests (29 tests)

**Modified Files:**
- `src/db/schema/index.ts` - Added proof-files export
- `src/db/schema/relations.ts` - Added proofFilesRelations
- `src/db/schema/audit-logs.ts` - Added "proof_file" to resource types
- `src/modules/production/actions.ts` - Added uploadProofFile, updateProofNotes, deleteProofFile
- `src/modules/production/queries.ts` - Added getProofFiles, getLatestProof, getProofFileSummary
- `src/modules/production/schema.ts` - Added uploadProofFileSchema, updateProofNotesSchema
- `src/modules/production/storage.ts` - Added proof file storage functions
- `src/modules/production/types.ts` - Added ProofFileWithUrl, ProofFileSummary types
- `src/modules/production/components/index.ts` - Added proof component exports
- `src/modules/production/components/production-project-detail.tsx` - Integrated ProofSection
