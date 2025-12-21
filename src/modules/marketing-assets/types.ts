/**
 * Marketing Assets Type Definitions
 *
 * TypeScript interfaces for marketing asset management.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * Task 3.1: Create type interfaces
 */

import type { AssetType } from "@/db/schema/marketing-assets";

/**
 * Marketing asset as returned from the database
 * Matches the marketing_assets table schema
 */
export interface MarketingAssetData {
  id: string;
  tenant_id: string;
  title_id: string;
  asset_type: AssetType;
  file_name: string | null;
  s3_key: string | null;
  content_type: string | null;
  file_size: number | null;
  text_content: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  uploaded_by: string | null;
  deleted_at: Date | null;
  deleted_by: string | null;
}

/**
 * Marketing asset for author portal display
 * Includes title information and display-friendly properties
 */
export interface AuthorMarketingAsset {
  id: string;
  assetType: AssetType;
  fileName: string | null;
  s3Key: string | null;
  contentType: string | null;
  fileSize: number | null;
  textContent: string | null;
  description: string | null;
  createdAt: Date;
}

/**
 * Marketing assets grouped by title for portal display
 * AC-21.2.1: Assets organized by title
 */
export interface AuthorMarketingAssetGroup {
  titleId: string;
  titleName: string;
  isbn: string | null;
  assets: AuthorMarketingAsset[];
}

/**
 * Result type for asset download action
 */
export interface AssetDownloadResult {
  url: string;
}
