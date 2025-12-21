/**
 * Marketing Assets Database Queries
 *
 * Query functions for marketing asset management.
 * Uses tenant isolation pattern from Story 21.1.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * Task 3.2-3.6: Create asset queries with tenant isolation
 *
 * Security: Uses tenant-isolated queries for defense-in-depth
 */

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { adminDb } from "@/db";
import { marketingAssets } from "@/db/schema/marketing-assets";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";

import type { AuthorMarketingAsset, AuthorMarketingAssetGroup } from "./types";

/**
 * Get marketing assets for an author's titles
 *
 * Story 21.2: AC-21.2.1 - Assets organized by title
 * AC-21.2.5: Handle titles without assets
 *
 * Security: Uses tenant-isolated queries for defense-in-depth
 * - Step 1: Join through titles to enforce tenant isolation
 * - Step 2: Filter assets by tenant_id AND title_id
 * - Step 3: Filter out soft-deleted assets
 *
 * @param contactId - The author's contact ID
 * @param tenantId - The tenant ID for isolation
 * @returns Array of asset groups organized by title
 */
export async function getAuthorMarketingAssets(
  contactId: string,
  tenantId: string,
): Promise<AuthorMarketingAssetGroup[]> {
  try {
    // Step 1: Get all title IDs where this contact is an author
    // Join through titles to enforce tenant isolation (defense-in-depth)
    const authorTitleEntries = await adminDb
      .select({
        titleId: titleAuthors.title_id,
        titleName: titles.title,
        isbn: titles.isbn,
      })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titles.tenant_id, tenantId),
        ),
      );

    if (authorTitleEntries.length === 0) {
      return [];
    }

    const titleIds = authorTitleEntries.map((e) => e.titleId);
    const titleMap = new Map(
      authorTitleEntries.map((e) => [
        e.titleId,
        { titleName: e.titleName, isbn: e.isbn },
      ]),
    );

    // Step 2: Get non-deleted assets for those titles
    const assets = await adminDb
      .select({
        id: marketingAssets.id,
        title_id: marketingAssets.title_id,
        asset_type: marketingAssets.asset_type,
        file_name: marketingAssets.file_name,
        s3_key: marketingAssets.s3_key,
        content_type: marketingAssets.content_type,
        file_size: marketingAssets.file_size,
        text_content: marketingAssets.text_content,
        description: marketingAssets.description,
        created_at: marketingAssets.created_at,
      })
      .from(marketingAssets)
      .where(
        and(
          eq(marketingAssets.tenant_id, tenantId),
          inArray(marketingAssets.title_id, titleIds),
          isNull(marketingAssets.deleted_at), // Exclude soft-deleted
        ),
      )
      .orderBy(asc(marketingAssets.title_id), asc(marketingAssets.asset_type));

    // Step 3: Group by title
    return groupAssetsByTitle(assets, titleMap);
  } catch (error) {
    console.error(
      "[getAuthorMarketingAssets] Failed to fetch marketing assets:",
      error,
    );
    // Return empty array on error to gracefully degrade
    return [];
  }
}

/**
 * Group assets by title for display
 *
 * @param assets - Raw asset records from database
 * @param titleMap - Map of title IDs to title info
 * @returns Grouped assets by title
 */
function groupAssetsByTitle(
  assets: Array<{
    id: string;
    title_id: string;
    asset_type: string;
    file_name: string | null;
    s3_key: string | null;
    content_type: string | null;
    file_size: number | null;
    text_content: string | null;
    description: string | null;
    created_at: Date;
  }>,
  titleMap: Map<string, { titleName: string; isbn: string | null }>,
): AuthorMarketingAssetGroup[] {
  const groups = new Map<string, AuthorMarketingAssetGroup>();

  for (const asset of assets) {
    const titleInfo = titleMap.get(asset.title_id);
    if (!titleInfo) continue;

    let group = groups.get(asset.title_id);
    if (!group) {
      group = {
        titleId: asset.title_id,
        titleName: titleInfo.titleName,
        isbn: titleInfo.isbn,
        assets: [],
      };
      groups.set(asset.title_id, group);
    }

    const authorAsset: AuthorMarketingAsset = {
      id: asset.id,
      assetType: asset.asset_type as AuthorMarketingAsset["assetType"],
      fileName: asset.file_name,
      s3Key: asset.s3_key,
      contentType: asset.content_type,
      fileSize: asset.file_size,
      textContent: asset.text_content,
      description: asset.description,
      createdAt: asset.created_at,
    };

    group.assets.push(authorAsset);
  }

  return Array.from(groups.values());
}

/**
 * Get a single asset with title author verification
 *
 * Used by download action to verify author has access to asset's title.
 *
 * @param assetId - The asset ID to fetch
 * @param contactId - The author's contact ID (from portal user)
 * @param tenantId - The tenant ID for isolation
 * @returns Asset data or null if not found/no access
 */
export async function getAssetWithTitleAuthorCheck(
  assetId: string,
  contactId: string,
  tenantId: string,
): Promise<{
  id: string;
  asset_type: string;
  file_name: string | null;
  s3_key: string | null;
  text_content: string | null;
} | null> {
  try {
    // Step 1: Get the asset
    const [asset] = await adminDb
      .select({
        id: marketingAssets.id,
        title_id: marketingAssets.title_id,
        asset_type: marketingAssets.asset_type,
        file_name: marketingAssets.file_name,
        s3_key: marketingAssets.s3_key,
        text_content: marketingAssets.text_content,
      })
      .from(marketingAssets)
      .where(
        and(
          eq(marketingAssets.id, assetId),
          eq(marketingAssets.tenant_id, tenantId),
          isNull(marketingAssets.deleted_at),
        ),
      )
      .limit(1);

    if (!asset) {
      return null;
    }

    // Step 2: Verify author has access to this title
    const [authorEntry] = await adminDb
      .select({ titleId: titleAuthors.title_id })
      .from(titleAuthors)
      .innerJoin(titles, eq(titleAuthors.title_id, titles.id))
      .where(
        and(
          eq(titleAuthors.contact_id, contactId),
          eq(titleAuthors.title_id, asset.title_id),
          eq(titles.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!authorEntry) {
      return null;
    }

    return asset;
  } catch (error) {
    console.error(
      "[getAssetWithTitleAuthorCheck] Failed to verify asset access:",
      error,
    );
    return null;
  }
}
