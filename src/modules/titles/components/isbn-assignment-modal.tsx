"use client";

import { AlertCircle, CheckCircle2, Hash, Info, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assignISBNToTitle } from "@/modules/isbn/actions";
import { getNextAvailableISBN } from "@/modules/isbn/queries";
import type { ISBNType, NextAvailableISBNPreview } from "@/modules/isbn/types";

interface ISBNAssignmentModalProps {
  titleId: string;
  titleName: string;
  currentISBN: string | null;
  currentEISBN: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * ISBN Assignment Modal for titles
 *
 * Story 2.9 - Smart ISBN Assignment with Row Locking
 *
 * AC 1: Modal displays the specific ISBN-13 that will be assigned
 * AC 1: Shows available count for the selected format
 * AC 1: Displays title name for confirmation
 * AC 1: "Assign This ISBN" primary action button
 * AC 8: Shows "Already assigned" message if format already has ISBN
 */
export function ISBNAssignmentModal({
  titleId,
  titleName,
  currentISBN,
  currentEISBN,
  open,
  onOpenChange,
  onSuccess,
}: ISBNAssignmentModalProps) {
  const [activeTab, setActiveTab] = useState<ISBNType>("physical");
  const [physicalPreview, setPhysicalPreview] =
    useState<NextAvailableISBNPreview | null>(null);
  const [ebookPreview, setEbookPreview] =
    useState<NextAvailableISBNPreview | null>(null);
  const [loadingPhysical, setLoadingPhysical] = useState(false);
  const [loadingEbook, setLoadingEbook] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load previews when modal opens
  useEffect(() => {
    if (open) {
      // Load physical preview if not already assigned
      if (!currentISBN) {
        setLoadingPhysical(true);
        startTransition(async () => {
          const result = await getNextAvailableISBN("physical");
          if (result.success) {
            setPhysicalPreview(result.data);
          }
          setLoadingPhysical(false);
        });
      }

      // Load ebook preview if not already assigned
      if (!currentEISBN) {
        setLoadingEbook(true);
        startTransition(async () => {
          const result = await getNextAvailableISBN("ebook");
          if (result.success) {
            setEbookPreview(result.data);
          }
          setLoadingEbook(false);
        });
      }
    } else {
      // Reset state when modal closes
      setPhysicalPreview(null);
      setEbookPreview(null);
    }
  }, [open, currentISBN, currentEISBN]);

  const handleAssign = async (format: ISBNType) => {
    startTransition(async () => {
      const result = await assignISBNToTitle({ titleId, format });

      if (result.success) {
        toast.success(
          `${format === "physical" ? "ISBN" : "eISBN"} assigned: ${
            result.data.isbn_13
          }`,
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const renderFormatContent = (
    format: ISBNType,
    currentValue: string | null,
    preview: NextAvailableISBNPreview | null,
    loading: boolean,
  ) => {
    const formatLabel = format === "physical" ? "Physical ISBN" : "Ebook ISBN";

    // Already assigned case (AC 8)
    if (currentValue) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">
                This title already has a {formatLabel} assigned
              </p>
              <code className="mt-2 block text-lg font-mono text-blue-800">
                {formatISBN(currentValue)}
              </code>
            </div>
          </div>
        </div>
      );
    }

    // Loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // No available ISBNs (AC 5)
    if (!preview) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                No {formatLabel}s available
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Import an ISBN block first to assign {formatLabel}s to titles.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Available ISBN preview (AC 1)
    return (
      <div className="space-y-4">
        {/* Title confirmation */}
        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">
            Assigning to
          </span>
          <p className="font-medium">{titleName}</p>
        </div>

        {/* ISBN preview */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Next Available {formatLabel}
            </span>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              {preview.availableCount} available
            </Badge>
          </div>
          <code className="block text-2xl font-mono font-bold">
            {formatISBN(preview.isbn_13)}
          </code>
        </div>

        {/* Assignment button */}
        <Button
          className="w-full"
          onClick={() => handleAssign(format)}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Assign This ISBN
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This ISBN will be permanently assigned to this title
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Assign ISBN
          </DialogTitle>
          <DialogDescription>
            Assign an ISBN from your pool to this title
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ISBNType)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="physical" className="relative">
              Physical
              {currentISBN && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ebook" className="relative">
              Ebook
              {currentEISBN && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                  ✓
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physical" className="mt-4">
            {renderFormatContent(
              "physical",
              currentISBN,
              physicalPreview,
              loadingPhysical,
            )}
          </TabsContent>

          <TabsContent value="ebook" className="mt-4">
            {renderFormatContent(
              "ebook",
              currentEISBN,
              ebookPreview,
              loadingEbook,
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format ISBN for display (978-X-XXXX-XXXX-X)
 */
function formatISBN(isbn: string): string {
  const digits = isbn.replace(/[-\s]/g, "");
  if (digits.length !== 13) return isbn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(
    4,
    8,
  )}-${digits.slice(8, 12)}-${digits.slice(12)}`;
}
