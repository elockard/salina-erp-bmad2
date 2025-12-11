"use client";

import { AlertTriangle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ContactRoleType, ContactWithRoles } from "../types";

/**
 * Check if an author contact needs TIN
 * Story 11.1 - AC-11.1.10: Missing TIN Warning Indicators
 *
 * Returns true if:
 * - Contact has author role
 * - Contact is US-based
 * - Contact does not have TIN on file
 */
function authorNeedsTIN(contact: ContactWithRoles): boolean {
  const hasAuthorRole = contact.roles.some((r) => r.role === "author");
  if (!hasAuthorRole) return false;

  // Default to US-based if not specified
  const isUSBased = contact.is_us_based ?? true;
  if (!isUSBased) return false;

  // Check if TIN is missing
  return !contact.tin_encrypted;
}

/**
 * Role badge configuration per AC-7.2.2
 */
const ROLE_BADGES: Record<
  ContactRoleType,
  { icon: string; label: string; color: string }
> = {
  author: {
    icon: "🖊️",
    label: "Author",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  customer: {
    icon: "🛒",
    label: "Customer",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  vendor: {
    icon: "🏭",
    label: "Vendor",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  distributor: {
    icon: "📦",
    label: "Distributor",
    color: "bg-green-100 text-green-700 border-green-200",
  },
};

type SortOption = "name" | "created";

interface ContactListProps {
  contacts: ContactWithRoles[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
  roleFilter: ContactRoleType | "all";
  onRoleFilterChange: (role: ContactRoleType | "all") => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  loading: boolean;
  onCreateClick: () => void;
}

/**
 * Get display name for a contact
 */
function getDisplayName(contact: ContactWithRoles): string {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

/**
 * Contact List component for the left panel
 *
 * AC-7.2.2: Contact List View (Left Panel)
 * - Left panel 320px desktop, 280px tablet, full-width mobile
 * - Table displays: Name | Email | Roles (badges) | Status
 * - Role badges with icons
 * - Filter by role (multi-select dropdown)
 * - Search by name, email (case-insensitive, debounced 300ms)
 * - Sort by name (A-Z default), created date
 * - Active/inactive filter toggle
 * - Loading state with skeleton loaders
 * - Empty state: "No contacts yet" + Create button
 */
export function ContactList({
  contacts,
  selectedContactId,
  onSelectContact,
  searchQuery,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortChange,
  loading,
  onCreateClick,
}: ContactListProps) {
  // Empty state - no contacts and no search
  if (
    !loading &&
    contacts.length === 0 &&
    !searchQuery &&
    roleFilter === "all"
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first contact to get started
        </p>
        <Button onClick={onCreateClick}>+ Create Contact</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search and Filter Controls */}
      <div className="p-4 space-y-3 border-b">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search contacts by name or email"
          />
        </div>

        {/* Role Filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) =>
            onRoleFilterChange(value as ContactRoleType | "all")
          }
        >
          <SelectTrigger className="w-full" aria-label="Filter by role">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="author">
              {ROLE_BADGES.author.icon} Author
            </SelectItem>
            <SelectItem value="customer">
              {ROLE_BADGES.customer.icon} Customer
            </SelectItem>
            <SelectItem value="vendor">
              {ROLE_BADGES.vendor.icon} Vendor
            </SelectItem>
            <SelectItem value="distributor">
              {ROLE_BADGES.distributor.icon} Distributor
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort and Inactive Options */}
        <div className="flex items-center justify-between">
          {/* Sort By (AC-7.2.2) */}
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="w-[130px]" aria-label="Sort by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Show Inactive Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive-contacts"
              checked={showInactive}
              onCheckedChange={(checked) =>
                onShowInactiveChange(checked === true)
              }
            />
            <Label
              htmlFor="show-inactive-contacts"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Show inactive
            </Label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading &&
        contacts.length === 0 &&
        (searchQuery || roleFilter !== "all") && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground text-center">
              No contacts found
              {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
              {roleFilter !== "all" && (
                <> with role &quot;{ROLE_BADGES[roleFilter].label}&quot;</>
              )}
            </p>
          </div>
        )}

      {/* Contact List */}
      {!loading && contacts.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <ul aria-label="Contacts">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => onSelectContact(contact.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b transition-colors",
                    "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                    "flex flex-col gap-1",
                    // Active item styling
                    selectedContactId === contact.id &&
                      "bg-primary/10 border-l-2 border-l-primary",
                    // Inactive contacts with reduced opacity
                    contact.status === "inactive" && "opacity-60",
                  )}
                  role="option"
                  aria-selected={selectedContactId === contact.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {getDisplayName(contact)}
                      </div>
                      {contact.email && (
                        <div className="text-sm text-muted-foreground truncate">
                          {contact.email}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Missing TIN Warning (Story 11.1 - AC-11.1.10) */}
                      {authorNeedsTIN(contact) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">
                                Missing TIN for 1099 reporting
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-xs",
                          contact.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200",
                        )}
                      >
                        {contact.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Role badges */}
                  {contact.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.roles.map((role) => {
                        const badgeConfig =
                          ROLE_BADGES[role.role as ContactRoleType];
                        if (!badgeConfig) return null;
                        return (
                          <Badge
                            key={role.id}
                            variant="outline"
                            className={cn("text-xs", badgeConfig.color)}
                          >
                            {badgeConfig.icon} {badgeConfig.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
