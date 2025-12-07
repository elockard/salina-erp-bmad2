"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getTitles } from "@/modules/titles/queries";
import type { TitleWithAuthor } from "@/modules/titles/types";
import { assignISBNToTitle } from "../actions";
import { getISBNById } from "../queries";
interface ISBNDetailModalProps {
  isbnId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete?: () => void;
}

/**
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
interface ISBNDetail {
  id: string;
  isbn_13: string;
  status: "available" | "assigned" | "registered" | "retired";
  assignedToTitleId: string | null;
  assignedTitleName: string | null;
  assignedByUserName: string | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get badge variant and class for ISBN status
 */
function getStatusBadgeProps(status: string): {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  switch (status) {
    case "available":
      return {
        variant: "outline",
        className: "border-green-500 bg-green-50 text-green-700",
      };
    case "assigned":
      return { variant: "default" };
    case "registered":
      return { variant: "secondary" };
    case "retired":
      return { variant: "destructive" };
    default:
      return { variant: "outline" };
  }
}

/**
 * ISBN detail modal component
 *
 * Story 2.8 - AC 7: ISBN detail modal shows comprehensive information
 * Story 2.9 - AC 1, 8: Assignment UI with title selection
 *
 * Features:
 * - Full ISBN-13 value with copy button
 * - Type and Status badges
 * - If assigned: Title name (clickable link), assigned by user name, assigned date
 * - If available: Title selector with search, "Assign This ISBN" button
 * - Close button
 */
export function ISBNDetailModal({
  isbnId,
  open,
  onOpenChange,
  onAssignmentComplete,
}: ISBNDetailModalProps) {
  const canAssign = useHasPermission(CREATE_AUTHORS_TITLES);
  const [isbn, setIsbn] = useState<ISBNDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [_isPending, startTransition] = useTransition();

  // Title selection state
  const [titles, setTitles] = useState<TitleWithAuthor[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TitleWithAuthor | null>(
    null,
  );
  const [titleSearchOpen, setTitleSearchOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch ISBN details when modal opens
  useEffect(() => {
    if (open && isbnId) {
      setLoading(true);
      setError(null);
      setSelectedTitle(null);

      startTransition(async () => {
        const result = await getISBNById(isbnId);
        if (result.success) {
          setIsbn(result.data as ISBNDetail);
        } else {
          setError(result.error);
        }
        setLoading(false);
      });
    } else {
      setIsbn(null);
      setError(null);
      setSelectedTitle(null);
    }
  }, [open, isbnId]);

  // Load titles when needed for assignment
  // Story 7.6: Filter titles that don't already have an ISBN assigned (unified, no type distinction)
  useEffect(() => {
    if (
      open &&
      isbn?.status === "available" &&
      canAssign &&
      titles.length === 0
    ) {
      setTitlesLoading(true);
      startTransition(async () => {
        const allTitles = await getTitles();
        // Story 7.6: Filter titles that don't already have an ISBN assigned
        const eligibleTitles = allTitles.filter((t) => !t.isbn);
        setTitles(eligibleTitles);
        setTitlesLoading(false);
      });
    }
  }, [open, isbn, canAssign, titles.length]);

  // Copy ISBN to clipboard
  const handleCopy = async () => {
    if (isbn) {
      await navigator.clipboard.writeText(isbn.isbn_13);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle ISBN assignment
  // Story 7.6: Simplified - no format/type distinction
  const handleAssign = async () => {
    if (!isbn || !selectedTitle) return;

    setAssigning(true);
    const result = await assignISBNToTitle({
      titleId: selectedTitle.id,
    });

    if (result.success) {
      toast.success(`ISBN assigned to "${selectedTitle.title}"`);
      onOpenChange(false);
      onAssignmentComplete?.();
    } else {
      toast.error(result.error);
    }
    setAssigning(false);
  };

  // Story 7.6: Check if selected title already has an ISBN (unified, no type distinction)
  const titleHasIsbn = selectedTitle ? !!selectedTitle.isbn : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>ISBN Details</DialogTitle>
          <DialogDescription>
            View detailed information about this ISBN
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isbn && !loading && (
          <div className="space-y-6">
            {/* ISBN-13 with copy button */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                ISBN-13
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-lg">
                  {isbn.isbn_13}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Status - Story 7.6: Removed Type badge, ISBNs are unified */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                Status
              </span>
              <div>
                <Badge {...getStatusBadgeProps(isbn.status)}>
                  {isbn.status.charAt(0).toUpperCase() + isbn.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Assignment details (if assigned) */}
            {isbn.status !== "available" && isbn.assignedTitleName && (
              <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium">Assignment Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assigned To</span>
                    <Link
                      href="/titles"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {isbn.assignedTitleName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  {isbn.assignedByUserName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assigned By</span>
                      <span>{isbn.assignedByUserName}</span>
                    </div>
                  )}
                  {isbn.assignedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Assigned Date
                      </span>
                      <span>
                        {format(new Date(isbn.assignedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignment UI (if available) */}
            {isbn.status === "available" && (
              <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium">Assign to Title</h4>

                {!canAssign ? (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      You don't have permission to assign ISBNs
                    </p>
                  </div>
                ) : titlesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : titles.length === 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-700">
                      No titles without an ISBN found. Create a title first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Title selector */}
                    <Popover
                      open={titleSearchOpen}
                      onOpenChange={setTitleSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={titleSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedTitle ? (
                            <span className="truncate">
                              {selectedTitle.title}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Select a title...
                            </span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search titles..." />
                          <CommandList>
                            <CommandEmpty>No titles found.</CommandEmpty>
                            <CommandGroup>
                              {titles.map((title) => (
                                <CommandItem
                                  key={title.id}
                                  value={title.title}
                                  onSelect={() => {
                                    setSelectedTitle(title);
                                    setTitleSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTitle?.id === title.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1 truncate">
                                    <p className="font-medium truncate">
                                      {title.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      by {title.author.name}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Warning if title already has an ISBN */}
                    {titleHasIsbn && selectedTitle && (
                      <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-700">
                          This title already has an ISBN assigned.
                        </p>
                      </div>
                    )}

                    {/* Assign button */}
                    <Button
                      className="w-full"
                      onClick={handleAssign}
                      disabled={!selectedTitle || titleHasIsbn || assigning}
                    >
                      {assigning ? (
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
                  </div>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>
                  {format(new Date(isbn.createdAt), "MMM d, yyyy HH:mm")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>
                  {format(new Date(isbn.updatedAt), "MMM d, yyyy HH:mm")}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
