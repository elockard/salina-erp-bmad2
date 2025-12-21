"use server";

/**
 * Marketing Assets Server Actions
 *
 * Server-side actions for marketing asset operations.
 * Provides secure asset download with author verification.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * AC-21.2.3: Asset downloads to device
 * AC-21.2.4: 15-minute presigned URL expiry
 *
 * Security: Verifies author has access to asset's title before generating URL
 */

import { and, eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { TEXT_ASSET_TYPES } from "@/db/schema/marketing-assets";
import { getCurrentUser } from "@/lib/auth";

import { getAssetWithTitleAuthorCheck } from "./queries";
import { getAssetDownloadUrl } from "./storage";

/**
 * Action result type for marketing asset operations
 * Following ActionResult pattern from production/types.ts
 */
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Get authenticated author's contact ID
 *
 * Verifies user is an author and returns their associated contact ID.
 *
 * @returns Contact ID and tenant ID, or null if not an author
 */
async function getAuthorContext(): Promise<{
  contactId: string;
  tenantId: string;
  userId: string;
} | null> {
  const user = await getCurrentUser();

  if (!user || user.role !== "author") {
    return null;
  }

  // Get the contact linked to this portal user
  const contact = await adminDb.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, "active"),
    ),
  });

  if (!contact) {
    return null;
  }

  return {
    contactId: contact.id,
    tenantId: user.tenant_id,
    userId: user.id,
  };
}

/**
 * Download a marketing asset
 *
 * Story 21.2: AC-21.2.3 - Asset downloads to device
 * AC-21.2.4 - 15-minute presigned URL expiry
 *
 * Security: Verifies author has access to the asset's title before generating URL
 *
 * @param assetId - The asset ID to download
 * @returns ActionResult with presigned URL on success
 */
export async function downloadAsset(
  assetId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const authorContext = await getAuthorContext();

    if (!authorContext) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify author has access to this asset's title
    const asset = await getAssetWithTitleAuthorCheck(
      assetId,
      authorContext.contactId,
      authorContext.tenantId,
    );

    if (!asset) {
      return { success: false, error: "Asset not found or access denied" };
    }

    // Text assets don't have S3 files - they should use a different method
    if (
      TEXT_ASSET_TYPES.includes(
        asset.asset_type as (typeof TEXT_ASSET_TYPES)[number],
      )
    ) {
      return {
        success: false,
        error:
          "Text assets cannot be downloaded as files. Use copy to clipboard instead.",
      };
    }

    if (!asset.s3_key || !asset.file_name) {
      return { success: false, error: "Asset file not found" };
    }

    // Generate presigned URL with Content-Disposition header
    const url = await getAssetDownloadUrl(asset.s3_key, asset.file_name);

    return { success: true, data: { url } };
  } catch (error) {
    console.error("[downloadAsset] Failed to generate download URL:", error);
    return {
      success: false,
      error: "Failed to generate download URL. Please try again.",
    };
  }
}
