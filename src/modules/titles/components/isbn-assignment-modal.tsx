"use client";

/**
 * ISBN Assignment Modal
 * Story 7.6: Simplified - removed format (physical/ebook) selection
 * ISBNs are now unified without type distinction
 *
 * Enhanced: Added prefix/pool selector to let users choose which ISBN pool to assign from
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assignISBNToTitle } from "@/modules/isbn/actions";
import {
  findSpecificISBN,
  getAvailablePrefixesForAssignment,
  getNextAvailableISBN,
  type PrefixAssignmentOption,
} from "@/modules/isbn/queries";
import type { ISBNStatus, NextAvailableISBNPreview } from "@/modules/isbn/types";

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
  const [prefixes, setPrefixes] = useState<PrefixAssignmentOption[]>([]);
  const [selectedPrefixId, setSelectedPrefixId] = useState<string | undefined>(
    undefined,
  );
  const [selectedPrefixLength, setSelectedPrefixLength] = useState<
    number | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Manual entry state
  const [entryMode, setEntryMode] = useState<"auto" | "manual">("auto");
  const [manualPubNumber, setManualPubNumber] = useState("");
  const [manualIsbn, setManualIsbn] = useState<{
    id: string;
    isbn_13: string;
    status: ISBNStatus;
  } | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // Load prefixes and initial preview when modal opens
  useEffect(() => {
    if (open && !currentISBN) {
      setLoading(true);
      startTransition(async () => {
        // Load available prefixes
        const prefixResult = await getAvailablePrefixesForAssignment();
        if (prefixResult.success && prefixResult.data.length > 0) {
          setPrefixes(prefixResult.data);
          // Auto-select first prefix
          const firstPrefix = prefixResult.data[0];
          setSelectedPrefixId(firstPrefix.id);
          setSelectedPrefixLength(firstPrefix.prefixLength);
          // Load preview for first prefix
          const previewResult = await getNextAvailableISBN(
            "physical",
            firstPrefix.id,
          );
          if (previewResult.success) {
            setPreview(previewResult.data);
          }
        } else {
          // No prefixes available - try to get any available ISBN
          const previewResult = await getNextAvailableISBN("physical");
          if (previewResult.success) {
            setPreview(previewResult.data);
          }
        }
        setLoading(false);
      });
    } else if (!open) {
      // Reset state when modal closes
      setPreview(null);
      setPrefixes([]);
      setSelectedPrefixId(undefined);
      setSelectedPrefixLength(undefined);
      setEntryMode("auto");
      setManualPubNumber("");
      setManualIsbn(null);
      setManualError(null);
    }
  }, [open, currentISBN]);

  // Load preview when prefix changes
  const handlePrefixChange = (prefixId: string) => {
    setSelectedPrefixId(prefixId);
    // Find and set the prefix length for proper ISBN formatting
    const selectedPrefix = prefixes.find((p) => p.id === prefixId);
    setSelectedPrefixLength(selectedPrefix?.prefixLength);

    // Reset manual entry when prefix changes
    setManualPubNumber("");
    setManualIsbn(null);
    setManualError(null);

    setLoading(true);
    startTransition(async () => {
      const result = await getNextAvailableISBN("physical", prefixId);
      if (result.success) {
        setPreview(result.data);
      }
      setLoading(false);
    });
  };

  // Look up a specific ISBN by publication number
  const handleManualLookup = () => {
    if (!selectedPrefixId || !manualPubNumber.trim()) {
      setManualError("Enter a publication number");
      return;
    }

    setLoading(true);
    setManualError(null);
    setManualIsbn(null);

    startTransition(async () => {
      const result = await findSpecificISBN(
        selectedPrefixId,
        manualPubNumber.trim(),
      );
      if (result.success) {
        if (result.data) {
          if (result.data.status !== "available") {
            setManualError(
              `This ISBN is already ${result.data.status}. Choose a different number.`,
            );
          } else {
            setManualIsbn(result.data);
          }
        } else {
          setManualError("ISBN not found in this prefix");
        }
      } else {
        setManualError(result.error);
      }
      setLoading(false);
    });
  };

  const handleAssign = async () => {
    startTransition(async () => {
      // Pass selected prefix and optional specific ISBN to assignment action
      const result = await assignISBNToTitle({
        titleId,
        prefixId: selectedPrefixId,
        isbnId: entryMode === "manual" ? manualIsbn?.id : undefined,
      });

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

    // Get the current prefix for display
    const currentPrefix = prefixes.find((p) => p.id === selectedPrefixId);
    const blockSize = currentPrefix
      ? Math.pow(10, 12 - currentPrefix.prefixLength)
      : 10;
    const pubNumDigits = Math.log10(blockSize);

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

        {/* Prefix selector - only show if multiple prefixes available */}
        {prefixes.length > 1 && (
          <div className="space-y-2">
            <Label>Select ISBN Pool</Label>
            <Select
              value={selectedPrefixId}
              onValueChange={handlePrefixChange}
              disabled={loading || isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a pool..." />
              </SelectTrigger>
              <SelectContent>
                {prefixes.map((prefix) => (
                  <SelectItem key={prefix.id} value={prefix.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono">{prefix.formattedPrefix}</span>
                      <span className="text-muted-foreground text-sm">
                        ({prefix.availableCount} available)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Entry mode tabs */}
        <Tabs
          value={entryMode}
          onValueChange={(v) => setEntryMode(v as "auto" | "manual")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">Next Available</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* Auto mode - next available */}
          <TabsContent value="auto" className="space-y-4 mt-4">
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
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <code className="block text-2xl font-mono font-bold">
                  {formatISBN(preview.isbn_13, selectedPrefixLength)}
                </code>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={isPending || loading}
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
          </TabsContent>

          {/* Manual mode - enter specific publication number */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pubNumber">
                Publication Number (0-{blockSize - 1})
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pubNumber"
                  type="text"
                  placeholder={`e.g., ${"0".repeat(pubNumDigits)}-${blockSize - 1}`}
                  value={manualPubNumber}
                  onChange={(e) => {
                    setManualPubNumber(e.target.value);
                    setManualIsbn(null);
                    setManualError(null);
                  }}
                  className="font-mono"
                  disabled={loading || isPending}
                />
                <Button
                  variant="outline"
                  onClick={handleManualLookup}
                  disabled={loading || isPending || !manualPubNumber.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Look Up"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the unique portion of the ISBN (the part before the check
                digit)
              </p>
            </div>

            {/* Error message */}
            {manualError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{manualError}</p>
              </div>
            )}

            {/* Found ISBN preview */}
            {manualIsbn && (
              <>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">
                      ISBN Available
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      Ready to assign
                    </Badge>
                  </div>
                  <code className="block text-2xl font-mono font-bold text-green-900">
                    {formatISBN(manualIsbn.isbn_13, selectedPrefixLength)}
                  </code>
                </div>

                <Button
                  className="w-full"
                  onClick={handleAssign}
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
              </>
            )}
          </TabsContent>
        </Tabs>

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
 * Format ISBN-13 for display with proper hyphenation
 *
 * ISBN-13 structure: GS1(3)-RegistrationGroup(1)-Registrant(variable)-Publication(variable)-Check(1)
 *
 * For standard US publishers (978-0 or 978-1), the registrant length varies based on block size:
 * - 10 ISBN block: 7-digit registrant → 978-X-XXXXXXX-X-X
 * - 100 ISBN block: 6-digit registrant → 978-X-XXXXXX-XX-X
 * - 1,000 ISBN block: 5-digit registrant → 978-X-XXXXX-XXX-X
 * - 10,000 ISBN block: 4-digit registrant → 978-X-XXXX-XXXX-X
 * - 100,000 ISBN block: 3-digit registrant → 978-X-XXX-XXXXX-X
 * - 1,000,000 ISBN block: 2-digit registrant → 978-X-XX-XXXXXX-X
 *
 * @param isbn - The ISBN-13 (with or without hyphens)
 * @param prefixLength - Optional prefix length (6-11) to determine hyphenation
 */
function formatISBN(isbn: string, prefixLength?: number): string {
  const digits = isbn.replace(/[-\s]/g, "");
  if (digits.length !== 13) return isbn;

  const gs1 = digits.slice(0, 3); // 978 or 979
  const registrationGroup = digits.slice(3, 4); // 0 or 1 for English

  // If prefix length provided, use it to determine registrant length
  // Otherwise, try to infer from common patterns or use a sensible default
  let registrantLength: number;

  if (prefixLength !== undefined && prefixLength >= 6 && prefixLength <= 11) {
    // prefix = gs1(3) + regGroup(1) + registrant
    // So registrant length = prefixLength - 4
    registrantLength = prefixLength - 4;
  } else {
    // Default: assume 6-digit registrant (100 ISBN block) - common for small publishers
    registrantLength = 6;
  }

  const registrant = digits.slice(4, 4 + registrantLength);
  const publication = digits.slice(4 + registrantLength, 12);
  const checkDigit = digits.slice(12);

  return `${gs1}-${registrationGroup}-${registrant}-${publication}-${checkDigit}`;
}
