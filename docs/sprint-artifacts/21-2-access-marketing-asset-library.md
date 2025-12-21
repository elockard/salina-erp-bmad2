# Story 21.2: Access Marketing Asset Library

Status: done

## Story

As an **author**,
I want **to download marketing assets for my titles**,
so that **I can promote my book**.

## Acceptance Criteria

1. **Given** I am in the author portal, **When** I navigate to marketing assets, **Then** I see available assets for my titles organized by title.

2. **Given** a title has marketing assets, **When** I view its assets, **Then** I see the following asset types:
   - Cover images (various sizes: thumbnail, web, print)
   - Back cover copy (text)
   - Title-specific author bio (text) - distinct from contact-level bio in `AuthorRoleData.bio`
   - Press releases (PDF)

3. **Given** I am viewing assets for a title, **When** I click download, **Then** the asset downloads to my device.

4. **Given** assets are stored in S3, **When** I request a download, **Then** a presigned URL is generated with 15-minute expiry.

5. **Given** I am in the author portal, **When** a title has no assets, **Then** I see a friendly message indicating no assets are available yet.

6. **Given** I am viewing the asset library, **When** on a mobile device, **Then** the layout is responsive and assets are easily accessible.

## Tasks / Subtasks

- [x] Task 1: Create marketing_assets database schema (AC: #1, #2)
  - [x] 1.1: Create `src/db/schema/marketing-assets.ts` following `proof-files.ts` pattern
  - [x] 1.2: Define asset_type enum: 'cover_thumbnail', 'cover_web', 'cover_print', 'back_cover_copy', 'author_bio', 'press_release'
  - [x] 1.3: Add core fields: id, tenant_id, title_id, asset_type, file_name, s3_key, content_type, file_size, text_content, description, created_at, updated_at
  - [x] 1.4: Add audit fields: uploaded_by (uuid, nullable), deleted_at (timestamp, nullable), deleted_by (uuid, nullable)
  - [x] 1.5: Add database indexes: (tenant_id, title_id), (tenant_id, deleted_at)
  - [x] 1.6: Export from `src/db/schema/index.ts`
  - [x] 1.7: Add relations in `src/db/schema/relations.ts` (title → assets)
  - [x] 1.8: Generate and run migration

- [x] Task 2: Create S3 storage utilities for assets (AC: #3, #4)
  - [x] 2.1: Create `src/modules/marketing-assets/storage.ts` following `statements/storage.ts` and `production/storage.ts` patterns
  - [x] 2.2: Define file validation constants (MAX_FILE_SIZES, ALLOWED_MIME_TYPES per asset type)
  - [x] 2.3: Implement `validateAssetFile(buffer, contentType, assetType)` with size and MIME validation
  - [x] 2.4: Implement `generateAssetS3Key(tenantId, titleId, assetType, filename)` with timestamp for uniqueness
  - [x] 2.5: Implement `uploadMarketingAsset(buffer, tenantId, titleId, assetType, filename, contentType)`
  - [x] 2.6: Implement `getAssetDownloadUrl(s3Key, filename)` with 15-minute presigned URL and Content-Disposition header
  - [x] 2.7: Implement `deleteMarketingAsset(s3Key)` for cleanup

- [x] Task 3: Create asset queries and types (AC: #1, #5)
  - [x] 3.1: Create `src/modules/marketing-assets/types.ts` with `MarketingAsset`, `AuthorMarketingAsset`, `AuthorMarketingAssetGroup` interfaces
  - [x] 3.2: Create `src/modules/marketing-assets/queries.ts` with `getAuthorMarketingAssets(contactId, tenantId)` query
  - [x] 3.3: Query joins: `marketing_assets` → `titles` → `title_authors` → filter by `contact_id`
  - [x] 3.4: Filter out soft-deleted assets (deleted_at IS NULL)
  - [x] 3.5: Group assets by title for display
  - [x] 3.6: Add tenant isolation via innerJoin pattern (defense-in-depth)

- [x] Task 4: Create asset download server action (AC: #3, #4)
  - [x] 4.1: Create `src/modules/marketing-assets/actions.ts` with `downloadAsset(assetId)` action
  - [x] 4.2: Use `ActionResult<{ url: string }>` pattern from `production/actions.ts`
  - [x] 4.3: Verify author has access to asset's title before generating URL
  - [x] 4.4: Return presigned URL for client-side download
  - [x] 4.5: Add error handling and logging

- [x] Task 5: Create asset library component (AC: #1, #2, #5, #6)
  - [x] 5.1: Create `src/app/(portal)/portal/components/author-asset-library.tsx` (async server component)
  - [x] 5.2: Create `src/app/(portal)/portal/components/asset-download-button.tsx` (client component for download handling)
  - [x] 5.3: Display assets grouped by title with title name and ISBN
  - [x] 5.4: Show asset type icons (Image, FileText, etc.) and download buttons
  - [x] 5.5: Handle text assets (back_cover_copy, author_bio) with copy-to-clipboard and view modal
  - [x] 5.6: Implement empty state following AuthorMyTitles pattern
  - [x] 5.7: Add loading skeleton with Suspense wrapper
  - [x] 5.8: Ensure responsive design (mobile-friendly grid/list)

- [x] Task 6: Integrate into portal page (AC: #1)
  - [x] 6.1: Import and add `AuthorAssetLibrary` to `src/app/(portal)/portal/page.tsx`
  - [x] 6.2: Position after "Production Status" section
  - [x] 6.3: Add Suspense with skeleton fallback

- [x] Task 7: Write unit tests (AC: All)
  - [x] 7.1: Test asset query returns only titles where contact is author
  - [x] 7.2: Test asset grouping by title
  - [x] 7.3: Test presigned URL generation with Content-Disposition
  - [x] 7.4: Test empty state handling
  - [x] 7.5: Test tenant isolation in queries
  - [x] 7.6: Test soft-delete filtering (excludes deleted_at NOT NULL)
  - [x] 7.7: Test file validation (size limits, MIME types)

## Dev Notes

### Important: Author Bio Clarification

The `author_bio` asset type stores **title-specific marketing bios** that may be customized per book. This is distinct from the general author bio stored in `contact_roles.role_specific_data` as `AuthorRoleData.bio` (see `src/modules/contacts/types.ts:117-122`).

When displaying author bio assets:
- If a title has a specific `author_bio` asset, display that
- Consider falling back to `AuthorRoleData.bio` if no title-specific bio exists (optional enhancement)

### Database Schema Design

Create `src/db/schema/marketing-assets.ts` following `proof-files.ts` pattern:

```typescript
import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { titles } from "./titles";

/**
 * Asset type enum for marketing materials
 * Story 21.2: Access Marketing Asset Library
 */
export const assetTypeEnum = pgEnum("asset_type", [
  "cover_thumbnail",  // Small cover image (150x225)
  "cover_web",        // Web-sized cover (600x900)
  "cover_print",      // Print-resolution cover (2400x3600)
  "back_cover_copy",  // Marketing text (stored as text_content, not S3)
  "author_bio",       // Title-specific author bio (stored as text_content)
  "press_release",    // PDF press release (stored in S3)
]);

export type AssetType = (typeof assetTypeEnum.enumValues)[number];

/** Asset types that store content as text vs files in S3 */
export const TEXT_ASSET_TYPES: AssetType[] = ["back_cover_copy", "author_bio"];
export const FILE_ASSET_TYPES: AssetType[] = ["cover_thumbnail", "cover_web", "cover_print", "press_release"];

/**
 * Marketing assets table
 * Stores references to S3-hosted marketing materials and text content for titles
 */
export const marketingAssets = pgTable("marketing_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull(),
  title_id: uuid("title_id").notNull().references(() => titles.id),
  asset_type: assetTypeEnum("asset_type").notNull(),

  // File info (for file-based assets: cover images, press releases)
  file_name: varchar("file_name", { length: 255 }),
  s3_key: varchar("s3_key", { length: 500 }),
  content_type: varchar("content_type", { length: 100 }),
  file_size: integer("file_size"), // bytes

  // Text content (for text-based assets: author_bio, back_cover_copy)
  text_content: text("text_content"),

  // Metadata
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),

  // Audit fields (following proof-files.ts pattern)
  uploaded_by: uuid("uploaded_by"), // User who uploaded the asset
  deleted_at: timestamp("deleted_at"), // Soft delete timestamp
  deleted_by: uuid("deleted_by"), // User who deleted the asset
}, (table) => ({
  tenantTitleIdx: index("marketing_assets_tenant_title_idx").on(table.tenant_id, table.title_id),
  tenantDeletedIdx: index("marketing_assets_tenant_deleted_idx").on(table.tenant_id, table.deleted_at),
}));

export const insertMarketingAssetSchema = createInsertSchema(marketingAssets);
export const selectMarketingAssetSchema = createSelectSchema(marketingAssets);
```

### File Validation Constants

```typescript
// src/modules/marketing-assets/storage.ts

/** Maximum file sizes by asset type (in bytes) */
export const MAX_FILE_SIZES: Record<string, number> = {
  cover_thumbnail: 1 * 1024 * 1024,    // 1 MB
  cover_web: 5 * 1024 * 1024,          // 5 MB
  cover_print: 50 * 1024 * 1024,       // 50 MB (high-res)
  press_release: 10 * 1024 * 1024,     // 10 MB
};

/** Allowed MIME types by asset type */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  cover_thumbnail: ["image/jpeg", "image/png", "image/webp"],
  cover_web: ["image/jpeg", "image/png", "image/webp"],
  cover_print: ["image/jpeg", "image/png", "image/tiff", "application/pdf"],
  press_release: ["application/pdf"],
};

/** Validate file before upload */
export function validateAssetFile(
  buffer: Buffer,
  contentType: string,
  assetType: AssetType,
): { valid: true } | { valid: false; error: string } {
  const maxSize = MAX_FILE_SIZES[assetType];
  if (maxSize && buffer.length > maxSize) {
    return { valid: false, error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB` };
  }

  const allowedTypes = ALLOWED_MIME_TYPES[assetType];
  if (allowedTypes && !allowedTypes.includes(contentType)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` };
  }

  return { valid: true };
}
```

### Asset Type Labels and Icons

```typescript
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cover_thumbnail: "Cover (Thumbnail)",
  cover_web: "Cover (Web)",
  cover_print: "Cover (Print)",
  back_cover_copy: "Back Cover Copy",
  author_bio: "Author Bio",
  press_release: "Press Release",
};

export const ASSET_TYPE_ICONS: Record<AssetType, LucideIcon> = {
  cover_thumbnail: ImageIcon,
  cover_web: ImageIcon,
  cover_print: ImageIcon,
  back_cover_copy: FileText,
  author_bio: User,
  press_release: FileText,
};
```

### S3 Storage Pattern

Follow `src/modules/statements/storage.ts` and `src/modules/production/storage.ts` patterns:

```typescript
// S3 key pattern with timestamp for uniqueness: assets/{tenant_id}/{title_id}/{asset_type}/{timestamp}-{filename}
export function generateAssetS3Key(
  tenantId: string,
  titleId: string,
  assetType: AssetType,
  filename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `assets/${tenantId}/${titleId}/${assetType}/${timestamp}-${sanitizedFilename}`;
}

// Presigned URL with 15-minute expiry and Content-Disposition for proper download
export async function getAssetDownloadUrl(
  s3Key: string,
  filename: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

### Query Pattern

Follow Story 21.1 query pattern with tenant isolation and soft-delete filtering:

```typescript
export async function getAuthorMarketingAssets(
  contactId: string,
  tenantId: string,
): Promise<AuthorMarketingAssetGroup[]> {
  try {
    // Step 1: Get author's title IDs with tenant isolation
    const authorTitleEntries = await adminDb
      .select({ titleId: titleAuthors.title_id })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titles.tenant_id, tenantId),
        ),
      );

    if (authorTitleEntries.length === 0) return [];

    const titleIds = authorTitleEntries.map((e) => e.titleId);

    // Step 2: Get non-deleted assets for those titles
    const assets = await adminDb.query.marketingAssets.findMany({
      where: and(
        eq(marketingAssets.tenant_id, tenantId),
        inArray(marketingAssets.title_id, titleIds),
        isNull(marketingAssets.deleted_at), // Exclude soft-deleted
      ),
      with: {
        title: {
          columns: { id: true, title: true, isbn: true },
        },
      },
      orderBy: [asc(marketingAssets.title_id), asc(marketingAssets.asset_type)],
    });

    // Step 3: Group by title
    return groupAssetsByTitle(assets);
  } catch (error) {
    console.error("[getAuthorMarketingAssets] Failed:", error);
    return [];
  }
}
```

### Server Action Pattern

Use `ActionResult<T>` pattern from `src/modules/production/actions.ts`:

```typescript
"use server";

import type { ActionResult } from "@/lib/action-result";

export async function downloadAsset(
  assetId: string,
): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "author") {
    return { success: false, error: "Unauthorized" };
  }

  // Verify author has access to this asset's title
  const asset = await getAssetWithTitleAuthorCheck(assetId, user.id, user.tenant_id);
  if (!asset) {
    return { success: false, error: "Asset not found or access denied" };
  }

  // Text assets don't have S3 files
  if (TEXT_ASSET_TYPES.includes(asset.asset_type)) {
    return { success: false, error: "Text assets cannot be downloaded as files" };
  }

  if (!asset.s3_key || !asset.file_name) {
    return { success: false, error: "Asset file not found" };
  }

  // Generate presigned URL with Content-Disposition header
  const url = await getAssetDownloadUrl(asset.s3_key, asset.file_name);
  return { success: true, data: { url } };
}
```

### Client Download Component Pattern

```typescript
// src/app/(portal)/portal/components/asset-download-button.tsx
"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAsset } from "@/modules/marketing-assets/actions";

export function AssetDownloadButton({ assetId }: { assetId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDownload() {
    setIsLoading(true);
    try {
      const result = await downloadAsset(assetId);
      if (result.success) {
        // Trigger browser download
        window.location.href = result.data.url;
      } else {
        console.error("Download failed:", result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}
```

### Text Asset Display Pattern

```typescript
// For text-based assets (back_cover_copy, author_bio), provide:
// 1. View in modal/accordion
// 2. Copy to clipboard button

function TextAssetDisplay({ asset }: { asset: MarketingAsset }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    if (asset.text_content) {
      await navigator.clipboard.writeText(asset.text_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground line-clamp-3">
        {asset.text_content}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
```

### Component Structure

```typescript
// AuthorAssetLibrary.tsx
export async function AuthorAssetLibrary({
  authorId,
  tenantId,
}: AuthorAssetLibraryProps) {
  const assetGroups = await getAuthorMarketingAssets(authorId, tenantId);

  if (assetGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Marketing Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No marketing assets available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Assets</CardTitle>
        <CardDescription>Download promotional materials for your titles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {assetGroups.map((group) => (
          <TitleAssetGroup key={group.titleId} group={group} />
        ))}
      </CardContent>
    </Card>
  );
}
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema/marketing-assets.ts` | Create | Marketing assets table schema with audit fields and indexes |
| `src/db/schema/index.ts` | Modify | Export marketing assets schema |
| `src/db/schema/relations.ts` | Modify | Add title → assets relation |
| `src/modules/marketing-assets/storage.ts` | Create | S3 storage utilities with validation |
| `src/modules/marketing-assets/types.ts` | Create | TypeScript interfaces |
| `src/modules/marketing-assets/queries.ts` | Create | Database queries with soft-delete filtering |
| `src/modules/marketing-assets/actions.ts` | Create | Server actions using ActionResult pattern |
| `src/modules/marketing-assets/index.ts` | Create | Module exports |
| `src/app/(portal)/portal/components/author-asset-library.tsx` | Create | Asset library component |
| `src/app/(portal)/portal/components/asset-download-button.tsx` | Create | Client download button |
| `src/app/(portal)/portal/components/author-asset-library-skeleton.tsx` | Create | Loading skeleton |
| `src/app/(portal)/portal/page.tsx` | Modify | Add AuthorAssetLibrary component |
| `tests/unit/author-asset-library.test.ts` | Create | Unit tests |

### Testing Standards

- **Location**: `tests/unit/`
- **Framework**: Vitest
- **Key Tests**:
  - Query returns only assets for author's titles
  - Query excludes soft-deleted assets (deleted_at NOT NULL)
  - Assets grouped correctly by title
  - Presigned URL generation with Content-Disposition header
  - File validation (size limits, MIME types)
  - Empty state displays correctly
  - Tenant isolation enforced
  - Text vs file asset handling

### References

- [Source: docs/epics.md#Story 21.2] - Story requirements and acceptance criteria
- [Source: docs/prd.md#FR183] - FR183: Author can access marketing asset library
- [Source: docs/architecture.md#File Storage] - S3 presigned URL pattern
- [Source: src/db/schema/proof-files.ts] - Primary schema pattern (audit fields, soft delete)
- [Source: src/modules/statements/storage.ts] - S3 storage utility pattern
- [Source: src/modules/production/storage.ts] - File validation pattern
- [Source: src/modules/production/actions.ts] - ActionResult<T> pattern
- [Source: src/modules/production/queries.ts:1059-1133] - Tenant isolation query pattern from Story 21.1
- [Source: src/modules/contacts/types.ts:117-122] - Existing AuthorRoleData.bio field
- [Source: src/app/(portal)/portal/components/author-production-status.tsx] - Portal component pattern
- [Source: src/app/(portal)/portal/page.tsx] - Portal page integration pattern

### Git Intelligence

Recent commits establishing patterns:
- `ec751fa` - Story 21.1: Portal component with tenant isolation, Suspense, skeleton
- `fe05f9c` - Story 18.5: S3 proof file storage patterns with audit fields
- `3c7efc7` - Stories 18.2-18.4: File upload/download patterns

### Previous Story Learnings (21.1)

- Use `parseISO` from date-fns for timezone-safe date parsing
- Add Suspense with skeleton fallback for loading states
- Implement try/catch with graceful degradation (return empty array on error)
- Use innerJoin through titles table for tenant isolation (defense-in-depth)
- Group related data for efficient display

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: Clean (no errors)
- Lint: Fixed 2 files with biome check --write
- Tests: 40/40 passed

### Completion Notes List

- **Task 1**: Created `src/db/schema/marketing-assets.ts` with asset_type enum, marketing_assets table with all required fields (id, tenant_id, title_id, asset_type, file_name, s3_key, content_type, file_size, text_content, description, created_at, updated_at, uploaded_by, deleted_at, deleted_by), composite indexes, and TypeScript types. Added exports to index.ts and relations to relations.ts. Generated and applied migration 0015_add_marketing_assets.sql.

- **Task 2**: Created `src/modules/marketing-assets/storage.ts` with file validation constants (MAX_FILE_SIZES, ALLOWED_MIME_TYPES), validateAssetFile function, generateAssetS3Key with timestamp for uniqueness, uploadMarketingAsset, getAssetDownloadUrl with 15-minute expiry and Content-Disposition header, and deleteMarketingAsset.

- **Task 3**: Created `src/modules/marketing-assets/types.ts` with MarketingAssetData, AuthorMarketingAsset, AuthorMarketingAssetGroup interfaces. Created `src/modules/marketing-assets/queries.ts` with getAuthorMarketingAssets query using tenant isolation via innerJoin and soft-delete filtering, plus getAssetWithTitleAuthorCheck for download verification.

- **Task 4**: Created `src/modules/marketing-assets/actions.ts` with downloadAsset server action using ActionResult<T> pattern, author context verification, and presigned URL generation. Created module index.ts for exports.

- **Task 5**: Created `src/app/(portal)/portal/components/author-asset-library.tsx` (async server component), `asset-download-button.tsx` (client component), `text-asset-display.tsx` (client component for copy-to-clipboard), and `author-asset-library-skeleton.tsx` (Suspense fallback). Implemented responsive grid layout, empty state, asset type icons, and grouped by title display.

- **Task 6**: Integrated AuthorAssetLibrary into `src/app/(portal)/portal/page.tsx` after Production Status section with Suspense wrapper.

- **Task 7**: Created comprehensive unit test file with 40 tests covering: asset type definitions, file validation (size limits, MIME types), S3 key generation, asset grouping, empty state handling, tenant isolation, text vs file asset handling, utility functions, and display logic.

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 | **Date:** 2025-12-21

**Review Outcome:** ✅ APPROVED

**Issues Found & Fixed:**
- [x] [MEDIUM] Removed unused `users` import in `actions.ts:21`
- [x] [MEDIUM] Fixed unused `assetType` parameter in `text-asset-display.tsx:30` (prefixed with `_`)
- [x] [MEDIUM] Fixed import ordering in 4 files via biome --write
- [x] [MEDIUM] Fixed formatting in 3 files (storage.ts, actions.ts, queries.ts)
- [x] [MEDIUM] Added missing `drizzle/migrations/meta/0015_snapshot.json` to File List

**Verification:**
- All 6 Acceptance Criteria validated against implementation ✅
- All 7 tasks verified as complete ✅
- TypeScript compilation: Clean ✅
- Biome lint: Clean ✅
- Unit tests: 40/40 passing ✅

### File List

- `src/db/schema/marketing-assets.ts` - Created: Marketing assets schema with enum, table, indexes
- `src/db/schema/index.ts` - Modified: Added export for marketing-assets
- `src/db/schema/relations.ts` - Modified: Added marketingAssets import and relations
- `drizzle/migrations/0015_add_marketing_assets.sql` - Created: Database migration
- `drizzle/migrations/meta/0015_snapshot.json` - Created: Drizzle migration snapshot (auto-generated)
- `src/modules/marketing-assets/storage.ts` - Created: S3 storage utilities with validation
- `src/modules/marketing-assets/types.ts` - Created: TypeScript interfaces
- `src/modules/marketing-assets/queries.ts` - Created: Database queries with tenant isolation
- `src/modules/marketing-assets/actions.ts` - Created: Server actions for downloads
- `src/modules/marketing-assets/index.ts` - Created: Module exports
- `src/app/(portal)/portal/components/author-asset-library.tsx` - Created: Main asset library component
- `src/app/(portal)/portal/components/asset-download-button.tsx` - Created: Client download button
- `src/app/(portal)/portal/components/text-asset-display.tsx` - Created: Text asset display component
- `src/app/(portal)/portal/components/author-asset-library-skeleton.tsx` - Created: Loading skeleton
- `src/app/(portal)/portal/page.tsx` - Modified: Added AuthorAssetLibrary integration
- `tests/unit/author-asset-library.test.ts` - Created: Unit tests (40 tests)

