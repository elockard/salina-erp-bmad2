"use client";

/**
 * ONIX Export Modal Component
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 5: Build export UI
 * Task 6: Build validation UI
 *
 * Modal for previewing and downloading ONIX XML exports.
 * Includes syntax highlighting, download functionality, and validation display.
 */

import { Check, Copy, Download, FileCode } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportResultWithValidation } from "../types";
import { ValidationResultsDisplay } from "./validation-results";

interface ONIXExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportResult: ExportResultWithValidation | null;
  isLoading?: boolean;
  /** Callback for re-validation */
  onRevalidate?: () => void;
  /** Whether validation is in progress */
  isValidating?: boolean;
}

/**
 * Simple XML syntax highlighting
 * Highlights tags, attributes, and content
 */
function highlightXML(xml: string): React.ReactNode[] {
  const lines = xml.split("\n");

  return lines.map((line, index) => {
    // Match XML patterns for highlighting
    const highlighted = line
      // XML declaration and processing instructions
      .replace(/(<\?[\s\S]*?\?>)/g, '<span class="text-gray-500">$1</span>')
      // Closing tags
      .replace(/(<\/[a-zA-Z0-9_-]+>)/g, '<span class="text-blue-600">$1</span>')
      // Self-closing tags
      .replace(
        /(<[a-zA-Z0-9_-]+[^>]*\/>)/g,
        '<span class="text-blue-600">$1</span>',
      )
      // Opening tags with attributes
      .replace(
        /(<[a-zA-Z0-9_-]+)(\s[^>]*)?(>)/g,
        '<span class="text-blue-600">$1</span><span class="text-purple-600">$2</span><span class="text-blue-600">$3</span>',
      )
      // Attribute values in quotes
      .replace(/("[^"]*")/g, '<span class="text-green-600">$1</span>');

    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: Static XML lines don't reorder
      <div key={index} className="leading-6">
        <span className="text-gray-400 select-none inline-block w-8 text-right mr-4">
          {index + 1}
        </span>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Highlighting our own generated XML, not user input */}
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  });
}

/**
 * ONIX Export Modal
 *
 * Displays XML preview with syntax highlighting and provides
 * copy/download functionality for the generated ONIX file.
 */
export function ONIXExportModal({
  open,
  onOpenChange,
  exportResult,
  isLoading = false,
  onRevalidate,
  isValidating = false,
}: ONIXExportModalProps) {
  const [copied, setCopied] = useState(false);
  const validationResult = exportResult?.validation;

  const handleCopy = async () => {
    if (!exportResult?.xml) return;

    try {
      await navigator.clipboard.writeText(exportResult.xml);
      setCopied(true);
      toast.success("XML copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    if (!exportResult?.xml || !exportResult?.filename) return;

    const blob = new Blob([exportResult.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${exportResult.filename}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            ONIX 3.1 Export
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Generating ONIX XML..."
              : exportResult
                ? `${exportResult.productCount} product${exportResult.productCount === 1 ? "" : "s"} ${validationResult?.valid ? "ready for export" : "- validation required"}`
                : "No export data available"}
          </DialogDescription>
        </DialogHeader>

        {/* Validation Results */}
        {validationResult && (
          <ValidationResultsDisplay
            result={validationResult}
            onRevalidate={onRevalidate}
            isLoading={isValidating}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : exportResult ? (
          <div className="h-[400px] w-full overflow-auto rounded-md border bg-gray-50 dark:bg-gray-900">
            <pre className="p-4 text-sm font-mono">
              {highlightXML(exportResult.xml)}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No XML content to display
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {exportResult?.filename}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={
                !exportResult ||
                (validationResult !== undefined && !validationResult.valid)
              }
              title={
                validationResult && !validationResult.valid
                  ? "Fix validation errors before copying"
                  : undefined
              }
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={
                !exportResult ||
                (validationResult !== undefined && !validationResult.valid)
              }
              title={
                validationResult && !validationResult.valid
                  ? "Fix validation errors before downloading"
                  : undefined
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Download XML
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
