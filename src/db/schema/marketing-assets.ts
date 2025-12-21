/**
 * Marketing Assets Schema
 *
 * Database schema for marketing assets associated with titles.
 * Stores cover images, back cover copy, author bios, and press releases.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * Epic: Epic 21 - Author Portal Expansion
 * FR: FR183 - Author can access marketing asset library
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * Soft Delete Pattern:
 * - deleted_at timestamp for soft deletes
 * - Queries filter isNull(deleted_at) by default
 * - S3 files are NOT deleted for compliance (retained in storage)
 *
 * Asset Types:
 * - File-based: cover_thumbnail, cover_web, cover_print, press_release (stored in S3)
 * - Text-based: back_cover_copy, author_bio (stored in text_content column)
 */

import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { titles } from "./titles";
import { users } from "./users";

/**
 * Asset Type Enum
 * Story 21.2: AC-2 - Asset types for marketing materials
 */
export const assetTypeEnum = pgEnum("asset_type", [
  "cover_thumbnail", // Small cover image (150x225)
  "cover_web", // Web-sized cover (600x900)
  "cover_print", // Print-resolution cover (2400x3600)
  "back_cover_copy", // Marketing text (stored as text_content, not S3)
  "author_bio", // Title-specific author bio (stored as text_content)
  "press_release", // PDF press release (stored in S3)
]);

export type AssetType = (typeof assetTypeEnum.enumValues)[number];

/** Asset types that store content as text vs files in S3 */
export const TEXT_ASSET_TYPES: AssetType[] = ["back_cover_copy", "author_bio"];
export const FILE_ASSET_TYPES: AssetType[] = [
  "cover_thumbnail",
  "cover_web",
  "cover_print",
  "press_release",
];

/** Asset type display labels */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cover_thumbnail: "Cover (Thumbnail)",
  cover_web: "Cover (Web)",
  cover_print: "Cover (Print)",
  back_cover_copy: "Back Cover Copy",
  author_bio: "Author Bio",
  press_release: "Press Release",
};

/**
 * Marketing Assets table
 * AC-21.2.1: Assets organized by title
 * AC-21.2.2: Multiple asset types supported
 * AC-21.2.4: S3 presigned URLs for downloads
 */
export const marketingAssets = pgTable(
  "marketing_assets",
  {
    /** Unique identifier (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id").notNull(),

    /** Foreign key to titles */
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),

    /** Asset type enum */
    asset_type: assetTypeEnum("asset_type").notNull(),

    // File info (for file-based assets: cover images, press releases)
    /** Original filename */
    file_name: varchar("file_name", { length: 255 }),

    /** S3 object key for the asset file */
    s3_key: varchar("s3_key", { length: 500 }),

    /** MIME type (image/jpeg, image/png, application/pdf, etc.) */
    content_type: varchar("content_type", { length: 100 }),

    /** File size in bytes */
    file_size: integer("file_size"),

    // Text content (for text-based assets: author_bio, back_cover_copy)
    /** Text content for text-based assets */
    text_content: text("text_content"),

    // Metadata
    /** Optional description of the asset */
    description: text("description"),

    /** Creation timestamp */
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** Last update timestamp */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Audit fields (following proof-files.ts pattern)
    /** User who uploaded this asset */
    uploaded_by: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Soft delete timestamp */
    deleted_at: timestamp("deleted_at", { withTimezone: true }),

    /** User who deleted this asset */
    deleted_by: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    /** Composite index on tenant_id and title_id for efficient lookups */
    tenantTitleIdx: index("marketing_assets_tenant_title_idx").on(
      table.tenant_id,
      table.title_id,
    ),

    /** Composite index on tenant_id and deleted_at for soft-delete filtering */
    tenantDeletedIdx: index("marketing_assets_tenant_deleted_idx").on(
      table.tenant_id,
      table.deleted_at,
    ),
  }),
);

/**
 * TypeScript type for marketing_assets SELECT queries
 */
export type MarketingAsset = typeof marketingAssets.$inferSelect;

/**
 * TypeScript type for marketing_assets INSERT operations
 */
export type MarketingAssetInsert = typeof marketingAssets.$inferInsert;
