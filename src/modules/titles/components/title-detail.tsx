"use client";

import { BookOpen, DollarSign, FileText, Pencil, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { CREATE_AUTHORS_TITLES, MANAGE_CONTRACTS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ContractWizardModal } from "@/modules/royalties/components/contract-wizard-modal";
import {
  type AuthorContact,
  getContactsWithAuthorRole,
  getTitleAuthors,
  type TitleAuthorInput,
  TitleAuthorsEditor,
  type TitleAuthorWithContact,
  updateTitleAuthors,
} from "@/modules/title-authors";
import { updateTitle } from "../actions";
import type { PublicationStatus, TitleWithAuthor } from "../types";
import { ISBNAssignmentModal } from "./isbn-assignment-modal";

interface TitleDetailProps {
  title: TitleWithAuthor;
  onTitleUpdated: (title: TitleWithAuthor) => void;
}

/**
 * Publication status badge styling
 */
const statusStyles: Record<PublicationStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-green-50 text-green-700 border-green-200",
  out_of_print: "bg-red-50 text-red-600 border-red-200",
};

const statusLabels: Record<PublicationStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  published: "Published",
  out_of_print: "Out of Print",
};

/**
 * Genre options for dropdown
 */
const GENRE_OPTIONS = [
  "Fiction",
  "Non-Fiction",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Thriller",
  "Biography",
  "Self-Help",
  "Business",
  "Children",
  "Young Adult",
  "Poetry",
  "History",
  "Other",
];

/**
 * Format ISBN-13 for display with proper hyphenation
 *
 * For US publishers (978-0 or 978-1), assumes 6-digit registrant (100 ISBN block)
 * which gives format: 978-X-XXXXXX-XX-X
 *
 * @param isbn - The ISBN-13 (with or without hyphens)
 */
function formatIsbn(isbn: string | null): string {
  if (!isbn) return "";
  const digits = isbn.replace(/[-\s]/g, "");
  if (digits.length !== 13) return isbn;

  // Assume 6-digit registrant (100 ISBN block) - common for small publishers
  const gs1 = digits.slice(0, 3);
  const registrationGroup = digits.slice(3, 4);
  const registrant = digits.slice(4, 10);
  const publication = digits.slice(10, 12);
  const checkDigit = digits.slice(12);

  return `${gs1}-${registrationGroup}-${registrant}-${publication}-${checkDigit}`;
}

/**
 * Inline editable field component
 */
function EditableField({
  label,
  value,
  field,
  type = "text",
  canEdit,
  onSave,
  options,
  placeholder,
}: {
  label: string;
  value: string | number | null;
  field: string;
  type?: "text" | "number" | "select" | "date";
  canEdit: boolean;
  onSave: (field: string, value: string | number | null) => Promise<void>;
  options?: string[];
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newValue =
        type === "number"
          ? editValue
            ? parseInt(editValue, 10)
            : null
          : editValue || null;
      await onSave(field, newValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || "");
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex gap-2">
          {type === "select" && options ? (
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={placeholder || `Select ${label.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={type === "date" ? "date" : type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
              autoFocus
            />
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      <p className="text-sm">
        {type === "select" && value
          ? statusLabels[value as PublicationStatus] || value
          : value || (
              <span className="text-muted-foreground italic">Not set</span>
            )}
      </p>
    </div>
  );
}

/**
 * Title Detail component for the right panel
 *
 * AC 3: Right panel displays selected title details
 * AC 3: Title, subtitle, author, genre, word count, status, publication date with inline edit
 * AC 4: Formats section with ISBN status and assignment buttons
 * AC 6: Inline edit controls disabled for unauthorized users
 */
export function TitleDetail({ title, onTitleUpdated }: TitleDetailProps) {
  const router = useRouter();
  const canEdit = useHasPermission(CREATE_AUTHORS_TITLES);
  const canManageContracts = useHasPermission(MANAGE_CONTRACTS);
  const [isbnModalOpen, setIsbnModalOpen] = useState(false);
  // Story 4.2: Contract creation modal state
  const [showContractWizard, setShowContractWizard] = useState(false);

  // Story 10.1: Multiple authors state
  const [titleAuthors, setTitleAuthors] = useState<TitleAuthorWithContact[]>(
    [],
  );
  const [availableAuthors, setAvailableAuthors] = useState<AuthorContact[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [authorsSaving, setAuthorsSaving] = useState(false);
  const [pendingAuthorChanges, setPendingAuthorChanges] = useState<
    TitleAuthorInput[] | null
  >(null);

  // Load title authors and available authors
  useEffect(() => {
    async function loadAuthorsData() {
      setAuthorsLoading(true);
      try {
        const [authors, contacts] = await Promise.all([
          getTitleAuthors(title.id),
          getContactsWithAuthorRole(),
        ]);
        setTitleAuthors(authors);
        setAvailableAuthors(contacts);
      } catch (error) {
        console.error("Failed to load authors:", error);
        toast.error("Failed to load authors data");
      } finally {
        setAuthorsLoading(false);
      }
    }
    loadAuthorsData();
  }, [title.id]);

  // Handle authors change from editor
  const handleAuthorsChange = (authors: TitleAuthorInput[]) => {
    setPendingAuthorChanges(authors);
  };

  // Save authors changes
  const handleSaveAuthors = async () => {
    if (!pendingAuthorChanges) return;

    setAuthorsSaving(true);
    try {
      const result = await updateTitleAuthors(title.id, pendingAuthorChanges);
      if (result.success) {
        setTitleAuthors(result.data);
        setPendingAuthorChanges(null);
        toast.success("Authors updated successfully");
        // Update parent with new primary author info if available
        const primaryAuthor = result.data.find((a) => a.is_primary);
        if (primaryAuthor?.contact) {
          const authorName =
            `${primaryAuthor.contact.first_name || ""} ${primaryAuthor.contact.last_name || ""}`.trim();
          onTitleUpdated({
            ...title,
            author: {
              id: primaryAuthor.contact_id,
              name: authorName || primaryAuthor.contact.email || "Unknown",
              email: primaryAuthor.contact.email,
            },
          });
        }
      } else {
        toast.error(result.error || "Failed to update authors");
      }
    } catch (error) {
      console.error("Failed to save authors:", error);
      toast.error("Failed to save authors");
    } finally {
      setAuthorsSaving(false);
    }
  };

  // Check if there are unsaved author changes
  const hasUnsavedAuthorChanges = pendingAuthorChanges !== null;

  const handleSaveField = async (
    field: string,
    value: string | number | null,
  ) => {
    const result = await updateTitle(title.id, { [field]: value });
    if (result.success) {
      onTitleUpdated(result.data);
    } else {
      toast.error(result.error);
      throw new Error(result.error);
    }
  };

  const handleStatusChange = async (status: PublicationStatus) => {
    const result = await updateTitle(title.id, { publication_status: status });
    if (result.success) {
      onTitleUpdated(result.data);
      toast.success("Status updated");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <EditableField
              label="Title"
              value={title.title}
              field="title"
              canEdit={canEdit}
              onSave={handleSaveField}
              placeholder="Enter title"
            />
          </div>
          {/* Status Badge with inline edit */}
          {canEdit ? (
            <Select
              value={title.publication_status}
              onValueChange={(v) => handleStatusChange(v as PublicationStatus)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="out_of_print">Out of Print</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge
              variant="outline"
              className={cn("shrink-0", statusStyles[title.publication_status])}
            >
              {statusLabels[title.publication_status]}
            </Badge>
          )}
        </div>
        <EditableField
          label="Subtitle"
          value={title.subtitle}
          field="subtitle"
          canEdit={canEdit}
          onSave={handleSaveField}
          placeholder="Enter subtitle (optional)"
        />
      </div>

      {/* Authors Section - Story 10.1: Multi-author support */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Authors
            </CardTitle>
            {hasUnsavedAuthorChanges && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300 bg-amber-50"
                >
                  Unsaved changes
                </Badge>
                <Button
                  size="sm"
                  onClick={handleSaveAuthors}
                  disabled={authorsSaving}
                >
                  {authorsSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {authorsLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading authors...
            </div>
          ) : (
            <TitleAuthorsEditor
              authors={titleAuthors}
              availableAuthors={availableAuthors}
              onAuthorsChange={handleAuthorsChange}
              readonly={!canEdit}
              isLoading={authorsSaving}
            />
          )}
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <EditableField
              label="Genre"
              value={title.genre}
              field="genre"
              type="select"
              options={GENRE_OPTIONS}
              canEdit={canEdit}
              onSave={handleSaveField}
              placeholder="Select genre"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <EditableField
              label="Word Count"
              value={title.word_count}
              field="word_count"
              type="number"
              canEdit={canEdit}
              onSave={handleSaveField}
              placeholder="Enter word count"
            />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="pt-4">
            <EditableField
              label="Publication Date"
              value={title.publication_date}
              field="publication_date"
              type="date"
              canEdit={canEdit}
              onSave={handleSaveField}
            />
          </CardContent>
        </Card>
      </div>

      {/* ISBN Section - Story 7.6: Unified single ISBN field */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            ISBN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {title.isbn ? (
                <p className="text-lg font-mono">{formatIsbn(title.isbn)}</p>
              ) : (
                <Badge variant="secondary">Not assigned</Badge>
              )}
            </div>
            {!title.isbn &&
              (canEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsbnModalOpen(true)}
                >
                  Assign ISBN
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button variant="outline" size="sm" disabled>
                          Assign ISBN
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You don't have permission to assign ISBNs</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* ISBN Assignment Modal - Story 7.6: Simplified without type selection */}
      <ISBNAssignmentModal
        titleId={title.id}
        titleName={title.title}
        currentISBN={title.isbn}
        open={isbnModalOpen}
        onOpenChange={setIsbnModalOpen}
        onSuccess={() => {
          // Trigger refresh of title data
          // The parent component should handle revalidation
          window.location.reload();
        }}
      />

      {/* Sales Summary Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sales Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Physical</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Ebook</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Sales data coming in Epic 3
          </p>
        </CardContent>
      </Card>

      {/* Contracts Section - Story 4.2: Create Contract entry point */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Contracts
          </CardTitle>
          {canManageContracts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContractWizard(true)}
            >
              Create Contract
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No contracts yet. Contract list will appear here.
          </div>
        </CardContent>
      </Card>

      {/* Story 4.2/4.3: Contract Creation Wizard Modal */}
      <ContractWizardModal
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
        defaultTitleId={title.id}
        defaultTitleName={title.title}
        onSuccess={(contractId) => router.push(`/royalties/${contractId}`)}
      />

      {/* Timestamps */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
        <span>Created: {new Date(title.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(title.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
