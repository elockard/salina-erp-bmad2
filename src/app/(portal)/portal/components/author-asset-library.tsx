/**
 * Author Asset Library Component
 *
 * Displays marketing assets for author's titles organized by title.
 * Async server component that fetches assets from database.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * AC-21.2.1: Assets organized by title
 * AC-21.2.2: Display all asset types (covers, text, PDFs)
 * AC-21.2.5: Empty state when no assets available
 * AC-21.2.6: Responsive mobile layout
 */

import { FileText, FolderOpen, ImageIcon, User } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ASSET_TYPE_LABELS,
  type AssetType,
  TEXT_ASSET_TYPES,
} from "@/db/schema/marketing-assets";
import { getAuthorMarketingAssets } from "@/modules/marketing-assets/queries";
import { formatFileSize } from "@/modules/marketing-assets/storage";
import type {
  AuthorMarketingAsset,
  AuthorMarketingAssetGroup,
} from "@/modules/marketing-assets/types";

import { AssetDownloadButton } from "./asset-download-button";
import { TextAssetDisplay } from "./text-asset-display";

interface AuthorAssetLibraryProps {
  authorId: string;
  tenantId: string;
}

/**
 * Get icon for asset type
 */
function getAssetIcon(assetType: AssetType) {
  switch (assetType) {
    case "cover_thumbnail":
    case "cover_web":
    case "cover_print":
      return ImageIcon;
    case "author_bio":
      return User;
    default:
      // back_cover_copy, press_release
      return FileText;
  }
}

/**
 * Check if asset is text-based
 */
function isTextAsset(assetType: AssetType): boolean {
  return TEXT_ASSET_TYPES.includes(assetType);
}

/**
 * Single Asset Item Component
 */
function AssetItem({ asset }: { asset: AuthorMarketingAsset }) {
  const Icon = getAssetIcon(asset.assetType);
  const isText = isTextAsset(asset.assetType);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">
              {ASSET_TYPE_LABELS[asset.assetType]}
            </p>
            {!isText && asset.fileName && (
              <p className="text-xs text-muted-foreground truncate">
                {asset.fileName}
                {asset.fileSize && (
                  <span className="ml-2">
                    ({formatFileSize(asset.fileSize)})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Download button for file assets */}
          {!isText && asset.s3Key && (
            <AssetDownloadButton assetId={asset.id} fileName={asset.fileName} />
          )}
        </div>

        {/* Text content display for text assets */}
        {isText && asset.textContent && (
          <TextAssetDisplay
            textContent={asset.textContent}
            assetType={asset.assetType}
          />
        )}

        {/* Description if available */}
        {asset.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {asset.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Title Asset Group Component
 * Displays all assets for a single title
 */
function TitleAssetGroup({ group }: { group: AuthorMarketingAssetGroup }) {
  return (
    <div className="space-y-3">
      {/* Title header */}
      <div className="space-y-1">
        <h4 className="font-medium">{group.titleName}</h4>
        {group.isbn && (
          <p className="text-sm text-muted-foreground font-mono">
            ISBN: {group.isbn}
          </p>
        )}
      </div>

      {/* Assets grid - responsive layout */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {group.assets.map((asset) => (
          <AssetItem key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

/**
 * Author Asset Library - Main Component
 */
export async function AuthorAssetLibrary({
  authorId,
  tenantId,
}: AuthorAssetLibraryProps) {
  const assetGroups = await getAuthorMarketingAssets(authorId, tenantId);

  // AC-21.2.5: Empty state when no assets available
  if (assetGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Marketing Assets
          </CardTitle>
          <CardDescription>
            Download promotional materials for your titles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No marketing assets available yet</p>
            <p className="text-xs mt-1">
              When your publisher uploads marketing materials, you&apos;ll find
              them here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total asset count
  const totalAssets = assetGroups.reduce(
    (sum, group) => sum + group.assets.length,
    0,
  );

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Marketing Assets
              </CardTitle>
              <CardDescription>
                Download promotional materials for your titles
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {totalAssets} {totalAssets === 1 ? "asset" : "assets"} across{" "}
              {assetGroups.length}{" "}
              {assetGroups.length === 1 ? "title" : "titles"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {assetGroups.map((group) => (
            <TitleAssetGroup key={group.titleId} group={group} />
          ))}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
