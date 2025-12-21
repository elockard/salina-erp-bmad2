"use client";

/**
 * Text Asset Display Component
 *
 * Client component for displaying text-based marketing assets.
 * Provides copy-to-clipboard functionality for author_bio and back_cover_copy.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * AC-21.2.2: Text asset display (back cover copy, author bio)
 */

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TextAssetDisplayProps {
  textContent: string;
  assetType: string;
}

export function TextAssetDisplay({
  textContent,
  assetType: _assetType, // Reserved for future asset-type-specific styling
}: TextAssetDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }

  // Preview: first 100 characters
  const preview =
    textContent.length > 100
      ? `${textContent.substring(0, 100)}...`
      : textContent;

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Preview text */}
        <p className="text-sm text-muted-foreground">
          {isOpen ? textContent : preview}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>

          {textContent.length > 100 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {isOpen ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Less</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">More</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {/* Full content (hidden by default if long) */}
        <CollapsibleContent />
      </Collapsible>
    </div>
  );
}
