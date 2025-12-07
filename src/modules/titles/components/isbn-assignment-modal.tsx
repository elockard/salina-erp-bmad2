"use client";

/**
 * ISBN Assignment Modal
 * Story 7.6: Simplified - removed format (physical/ebook) selection
 * ISBNs are now unified without type distinction
 */

import { AlertCircle, CheckCircle2, Hash, Info, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assignISBNToTitle } from "@/modules/isbn/actions";
import { getNextAvailableISBN } from "@/modules/isbn/queries";
import type { NextAvailableISBNPreview } from "@/modules/isbn/types";

interface ISBNAssignmentModalProps {
  titleId: string;
  titleName: string;
  currentISBN: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * ISBN Assignment Modal for titles
 *
 * Story 2.9 - Smart ISBN Assignment with Row Locking
 * Story 7.6 - Simplified: Removed format tabs, ISBNs are unified
 *
 * AC 1: Modal displays the specific ISBN-13 that will be assigned
 * AC 1: Shows available count
 * AC 1: Displays title name for confirmation
 * AC 1: "Assign This ISBN" primary action button
 * AC 8: Shows "Already assigned" message if title already has ISBN
 */
export function ISBNAssignmentModal({
  titleId,
  titleName,
  currentISBN,
  open,
  onOpenChange,
  onSuccess,
}: ISBNAssignmentModalProps) {
  const [preview, setPreview] = useState<NextAvailableISBNPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load preview when modal opens
  useEffect(() => {
    if (open && !currentISBN) {
      setLoading(true);
      startTransition(async () => {
        // Story 7.6: Use "physical" as default format for backward compatibility
        // The backend will ignore the format for unified ISBN assignment
        const result = await getNextAvailableISBN("physical");
        if (result.success) {
          setPreview(result.data);
        }
        setLoading(false);
      });
    } else if (!open) {
      // Reset state when modal closes
      setPreview(null);
    }
  }, [open, currentISBN]);

  const handleAssign = async () => {
    startTransition(async () => {
      // Story 7.6: Unified ISBN assignment - no format needed
      const result = await assignISBNToTitle({ titleId });

      if (result.success) {
        toast.success(`ISBN assigned: ${result.data.isbn_13}`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const renderContent = () => {
    // Already assigned case
    if (currentISBN) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">
                This title already has an ISBN assigned
              </p>
              <code className="mt-2 block text-lg font-mono text-blue-800">
                {formatISBN(currentISBN)}
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

    // No available ISBNs
    if (!preview) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">No ISBNs available</p>
              <p className="text-sm text-amber-700 mt-1">
                Import an ISBN block first to assign ISBNs to titles.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Available ISBN preview
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
              Next Available ISBN
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
        <Button className="w-full" onClick={handleAssign} disabled={isPending}>
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

        {renderContent()}
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
