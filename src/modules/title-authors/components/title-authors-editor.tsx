"use client";

/**
 * Title Authors Editor Component
 *
 * Allows editing multiple authors for a title with ownership percentages.
 * Supports adding/removing authors, setting primary, and preset splits.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * AC-10.1.4: Title Authors Management UI
 * AC-10.1.5: Primary Author Designation
 */

import Decimal from "decimal.js";
import { Check, ChevronsUpDown, Plus, Star, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AuthorContact } from "../queries";
import { calculateEqualSplit, validateOwnershipSum } from "../schema";
import {
  OWNERSHIP_PRESETS,
  type TitleAuthorInput,
  type TitleAuthorWithContact,
} from "../types";

// =============================================================================
// Type Definitions
// =============================================================================

interface TitleAuthorsEditorProps {
  /** Current authors with contact info */
  authors: TitleAuthorWithContact[];
  /** Available contacts with author role */
  availableAuthors: AuthorContact[];
  /** Callback when authors change */
  onAuthorsChange: (authors: TitleAuthorInput[]) => void;
  /** Whether the form is read-only */
  readonly?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

interface LocalAuthor {
  contactId: string;
  displayName: string;
  email: string | null;
  ownershipPercentage: string;
  isPrimary: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function TitleAuthorsEditor({
  authors,
  availableAuthors,
  onAuthorsChange,
  readonly = false,
  isLoading = false,
}: TitleAuthorsEditorProps) {
  // Local state for editing
  const [localAuthors, setLocalAuthors] = useState<LocalAuthor[]>([]);
  const [authorSelectorOpen, setAuthorSelectorOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [authorToDelete, setAuthorToDelete] = useState<string | null>(null);

  // Initialize local state from props
  useEffect(() => {
    setLocalAuthors(
      authors.map((a) => ({
        contactId: a.contact_id,
        displayName: a.contact
          ? `${a.contact.first_name || ""} ${a.contact.last_name || ""}`.trim()
          : "Unknown",
        email: a.contact?.email || null,
        ownershipPercentage: a.ownership_percentage,
        isPrimary: a.is_primary,
      })),
    );
  }, [authors]);

  // Calculate ownership sum validation
  const ownershipValidation = validateOwnershipSum(
    localAuthors.map((a) => a.ownershipPercentage),
  );

  // Notify parent of changes
  const notifyChange = useCallback(
    (updatedAuthors: LocalAuthor[]) => {
      onAuthorsChange(
        updatedAuthors.map((a) => ({
          contact_id: a.contactId,
          ownership_percentage: a.ownershipPercentage,
          is_primary: a.isPrimary,
        })),
      );
    },
    [onAuthorsChange],
  );

  // Handle adding a new author
  const handleAddAuthor = (author: AuthorContact) => {
    // Check if already added
    if (localAuthors.some((a) => a.contactId === author.id)) {
      return;
    }

    // Calculate default percentage (remaining to make 100%)
    let defaultPercentage = "0.00";
    const currentTotal = localAuthors.reduce(
      (sum, a) => sum.plus(new Decimal(a.ownershipPercentage)),
      new Decimal(0),
    );
    const remaining = new Decimal(100).minus(currentTotal);
    if (remaining.gt(0)) {
      defaultPercentage = remaining.toFixed(2);
    }

    const newAuthor: LocalAuthor = {
      contactId: author.id,
      displayName: author.displayName,
      email: author.email,
      ownershipPercentage: defaultPercentage,
      isPrimary: localAuthors.length === 0, // First author is primary
    };

    const updated = [...localAuthors, newAuthor];
    setLocalAuthors(updated);
    notifyChange(updated);
    setAuthorSelectorOpen(false);
  };

  // Handle removing an author
  const handleRemoveAuthor = (contactId: string) => {
    if (localAuthors.length <= 1) {
      return; // Can't remove last author
    }
    setAuthorToDelete(contactId);
    setDeleteConfirmOpen(true);
  };

  const confirmRemoveAuthor = () => {
    if (!authorToDelete) return;

    const removedWasPrimary = localAuthors.find(
      (a) => a.contactId === authorToDelete,
    )?.isPrimary;

    let updated = localAuthors.filter((a) => a.contactId !== authorToDelete);

    // If removed was primary, make first remaining author primary
    if (removedWasPrimary && updated.length > 0) {
      updated = updated.map((a, idx) => ({
        ...a,
        isPrimary: idx === 0,
      }));
    }

    setLocalAuthors(updated);
    notifyChange(updated);
    setDeleteConfirmOpen(false);
    setAuthorToDelete(null);
  };

  // Handle percentage change
  const handlePercentageChange = (contactId: string, value: string) => {
    // Allow partial input during typing
    const updated = localAuthors.map((a) =>
      a.contactId === contactId ? { ...a, ownershipPercentage: value } : a,
    );
    setLocalAuthors(updated);
    notifyChange(updated);
  };

  // Handle setting primary author
  const handleSetPrimary = (contactId: string) => {
    const updated = localAuthors.map((a) => ({
      ...a,
      isPrimary: a.contactId === contactId,
    }));
    setLocalAuthors(updated);
    notifyChange(updated);
  };

  // Apply a preset split
  const handleApplyPreset = (presetLabel: string) => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === presetLabel);
    if (!preset) return;

    let percentages: string[];
    if (preset.values) {
      // Fixed values preset
      if (preset.values.length !== localAuthors.length) {
        // Need matching author count
        return;
      }
      percentages = preset.values.map((v) => v.toFixed(2));
    } else if (preset.calculate) {
      // Dynamic calculation - returns number[], convert to string[]
      const calculated = preset.calculate(localAuthors.length);
      percentages = calculated.map((v) => v.toFixed(2));
    } else {
      return;
    }

    const updated = localAuthors.map((a, idx) => ({
      ...a,
      ownershipPercentage: percentages[idx] || a.ownershipPercentage,
    }));
    setLocalAuthors(updated);
    notifyChange(updated);
  };

  // Apply equal split
  const handleEqualSplit = () => {
    const percentages = calculateEqualSplit(localAuthors.length);
    const updated = localAuthors.map((a, idx) => ({
      ...a,
      ownershipPercentage: percentages[idx] || a.ownershipPercentage,
    }));
    setLocalAuthors(updated);
    notifyChange(updated);
  };

  // Get available presets based on author count
  const availablePresets = OWNERSHIP_PRESETS.filter((p) => {
    if (p.values === null) return true; // Dynamic presets always available
    return p.values.length === localAuthors.length;
  });

  // Authors not yet added
  const unassignedAuthors = availableAuthors.filter(
    (a) => !localAuthors.some((la) => la.contactId === a.id),
  );

  return (
    <div className="space-y-4">
      {/* Header with total percentage indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">Authors</span>
          <Badge variant="outline" className="ml-2">
            {localAuthors.length}{" "}
            {localAuthors.length === 1 ? "author" : "authors"}
          </Badge>
        </div>

        {/* Total percentage indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total:</span>
          <Badge
            variant={ownershipValidation.valid ? "default" : "destructive"}
            className={cn(
              ownershipValidation.valid
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-red-100 text-red-800 hover:bg-red-100",
            )}
          >
            {ownershipValidation.total}%
          </Badge>
          {!ownershipValidation.valid && (
            <span className="text-xs text-red-600">Must equal 100%</span>
          )}
        </div>
      </div>

      {/* Authors list */}
      <div className="space-y-2">
        {localAuthors.map((author) => (
          <div
            key={author.contactId}
            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
          >
            {/* Primary star indicator */}
            <button
              type="button"
              onClick={() => !readonly && handleSetPrimary(author.contactId)}
              disabled={readonly}
              className={cn(
                "p-1 rounded-full transition-colors",
                author.isPrimary
                  ? "text-yellow-500"
                  : "text-gray-300 hover:text-yellow-400",
                readonly && "cursor-default",
              )}
              title={author.isPrimary ? "Primary Author" : "Set as Primary"}
            >
              <Star
                className={cn("h-4 w-4", author.isPrimary && "fill-current")}
              />
            </button>

            {/* Author info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {author.displayName}
                </span>
                {author.isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
              {author.email && (
                <span className="text-xs text-muted-foreground truncate block">
                  {author.email}
                </span>
              )}
            </div>

            {/* Ownership percentage input */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={author.ownershipPercentage}
                onChange={(e) =>
                  handlePercentageChange(author.contactId, e.target.value)
                }
                disabled={readonly}
                className="w-20 text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>

            {/* Remove button */}
            {!readonly && localAuthors.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveAuthor(author.contactId)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {!readonly && (
        <div className="flex items-center gap-2">
          {/* Add Author button with popover selector */}
          <Popover
            open={authorSelectorOpen}
            onOpenChange={setAuthorSelectorOpen}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || unassignedAuthors.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Author
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search authors..." />
                <CommandList>
                  <CommandEmpty>No authors available.</CommandEmpty>
                  <CommandGroup>
                    {unassignedAuthors.map((author) => (
                      <CommandItem
                        key={author.id}
                        value={author.displayName}
                        onSelect={() => handleAddAuthor(author)}
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{author.displayName}</p>
                          {author.penName && (
                            <p className="text-xs text-muted-foreground">
                              Pen name: {author.penName}
                            </p>
                          )}
                          {author.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {author.email}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Presets dropdown */}
          {localAuthors.length >= 2 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <ChevronsUpDown className="h-4 w-4 mr-2" />
                  Presets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleEqualSplit}>
                  Equal Split
                </DropdownMenuItem>
                {availablePresets
                  .filter((p) => p.values !== null)
                  .map((preset) => (
                    <DropdownMenuItem
                      key={preset.label}
                      onClick={() => handleApplyPreset(preset.label)}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Empty state */}
      {localAuthors.length === 0 && !readonly && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Users className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No authors assigned. Add at least one author.
          </p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Author</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this author from the title? You
              will need to adjust the ownership percentages afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAuthorToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAuthor}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
