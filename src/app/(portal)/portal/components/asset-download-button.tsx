"use client";

/**
 * Asset Download Button Component
 *
 * Client component for handling marketing asset downloads.
 * Calls server action to get presigned URL, then triggers browser download.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * AC-21.2.3: Asset downloads to device
 */

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadAsset } from "@/modules/marketing-assets/actions";

interface AssetDownloadButtonProps {
  assetId: string;
  fileName: string | null;
}

export function AssetDownloadButton({
  assetId,
  fileName,
}: AssetDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await downloadAsset(assetId);

      if (result.success && result.data) {
        // Trigger browser download by navigating to presigned URL
        window.location.href = result.data.url;
      } else {
        setError(result.error || "Download failed");
        console.error("Download failed:", result.error);
      }
    } catch (err) {
      setError("Download failed. Please try again.");
      console.error("Download error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <span>Download {fileName || "file"}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
