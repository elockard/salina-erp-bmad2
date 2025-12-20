"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExportDialog } from "@/modules/import-export/components";
import { fetchContacts, getContactWithRoles } from "../actions";
import type { ContactRoleType, ContactWithRoles } from "../types";
import { ContactDetail } from "./contact-detail";
import { ContactForm } from "./contact-form";
import { ContactList } from "./contact-list";

interface ContactsSplitViewProps {
  initialContacts: ContactWithRoles[];
  /** Initial role filter from URL param (e.g., /contacts?role=author) */
  initialRoleFilter?: ContactRoleType;
}

/**
 * Split View layout for Contact Management
 *
 * AC-7.2.1: Page Layout
 * - Split view layout: Left panel 320px (list), Right panel fluid (detail)
 * - Responsive: Desktop 320px left, Tablet 280px left, Mobile list-only with slide-in detail
 * - Server Components for initial fetch; Client Components for interactivity
 *
 * AC-7.2.2: Contact List View (Left Panel)
 * - Scrollable contact list with search box at top
 * - Filter by role (dropdown)
 * - Active/inactive filter toggle
 *
 * AC-7.2.4: Contact Detail View (Right Panel)
 * - Shows when contact selected from list
 * - Tab sections for General, Roles, Payment
 */
type SortOption = "name" | "created";

export function ContactsSplitView({
  initialContacts,
  initialRoleFilter,
}: ContactsSplitViewProps) {
  const [contacts, setContacts] = useState<ContactWithRoles[]>(initialContacts);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [selectedContact, setSelectedContact] =
    useState<ContactWithRoles | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [roleFilter, setRoleFilter] = useState<ContactRoleType | "all">(
    initialRoleFilter ?? "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Reload contacts after mutations
  const reloadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchContacts({
        includeInactive: showInactive,
        role: roleFilter === "all" ? undefined : roleFilter,
        searchQuery: searchQuery || undefined,
      });
      setContacts(result);
    } catch (error) {
      console.error("Failed to reload contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [showInactive, roleFilter, searchQuery]);

  // Reload when filters change
  useEffect(() => {
    reloadContacts();
  }, [reloadContacts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      reloadContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [reloadContacts]);

  // Load selected contact details
  const loadContactDetails = useCallback(async (contactId: string | null) => {
    if (!contactId) {
      setSelectedContact(null);
      return;
    }

    try {
      const contact = await getContactWithRoles(contactId);
      setSelectedContact(contact);
    } catch (error) {
      console.error("Failed to load contact details:", error);
      setSelectedContact(null);
    }
  }, []);

  useEffect(() => {
    loadContactDetails(selectedContactId);
  }, [selectedContactId, loadContactDetails]);

  // Handle contact selection
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setMobileDetailOpen(true);
  };

  // Sort function based on sortBy state
  const sortContacts = (contactList: ContactWithRoles[]) => {
    return [...contactList].sort((a, b) => {
      if (sortBy === "created") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`,
      );
    });
  };

  // Handle contact created
  const handleContactCreated = (contact: ContactWithRoles) => {
    setContacts((prev) => sortContacts([...prev, contact]));
    setSelectedContactId(contact.id);
    setSelectedContact(contact);
    setCreateDialogOpen(false);
    setMobileDetailOpen(true);
    toast.success("Contact created successfully");
  };

  // Handle contact updated
  const handleContactUpdated = (contact: ContactWithRoles) => {
    setContacts((prev) =>
      sortContacts(prev.map((c) => (c.id === contact.id ? contact : c))),
    );
    setSelectedContact(contact);
  };

  // Handle contact deactivated
  const handleContactDeactivated = (contact: ContactWithRoles) => {
    if (!showInactive) {
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      if (selectedContactId === contact.id) {
        setSelectedContactId(null);
        setSelectedContact(null);
        setMobileDetailOpen(false);
      }
    } else {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? contact : c)),
      );
      setSelectedContact(contact);
    }
  };

  // Handle contact reactivated
  const handleContactReactivated = (contact: ContactWithRoles) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
    setSelectedContact(contact);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Contact List */}
      <div
        className={cn(
          "flex flex-col border-r bg-background",
          "w-[320px] lg:w-[320px] md:w-[280px]",
          "max-md:w-full max-md:border-r-0",
          mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Header with Create Button */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <div className="flex items-center gap-2">
            <ExportDialog />
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              + Create Contact
            </Button>
          </div>
        </div>

        {/* Contact List */}
        <ContactList
          contacts={sortContacts(contacts)}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          loading={loading}
          onCreateClick={() => setCreateDialogOpen(true)}
        />
      </div>

      {/* Right Panel - Contact Detail */}
      <div
        className={cn(
          "flex-1 overflow-auto bg-muted/30",
          "max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-background",
          !mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Mobile Back Button */}
        {mobileDetailOpen && (
          <div className="md:hidden p-4 border-b flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileDetailOpen(false)}
            >
              ← Back to list
            </Button>
          </div>
        )}

        {selectedContact ? (
          <ContactDetail
            contact={selectedContact}
            onContactUpdated={handleContactUpdated}
            onContactDeactivated={handleContactDeactivated}
            onContactReactivated={handleContactReactivated}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a contact to view details</p>
          </div>
        )}
      </div>

      {/* Create Contact Dialog */}
      <ContactForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleContactCreated}
      />
    </div>
  );
}
