import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { VIEW_CONTACTS } from "@/lib/permissions";
import { ContactsSplitView } from "@/modules/contacts/components/contacts-split-view";
import { getContacts } from "@/modules/contacts/queries";
import type { ContactRoleType } from "@/modules/contacts/types";

/**
 * Contacts management page - Server Component
 *
 * Story 7.2: Build Contact Management Interface
 * AC-7.2.1: Route /contacts renders Split View layout
 * AC-7.2.5: Permission checks - VIEW_CONTACTS required
 *
 * Story 0.5: Consolidate Authors into Contacts
 * AC-0.5.3: URL param `role=author` sets initial filter state
 */

export const metadata = {
  title: "Contacts | Salina ERP",
  description: "Manage contacts for your publishing company",
};

interface ContactsPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Check VIEW_CONTACTS permission
  const canView = await hasPermission(VIEW_CONTACTS);
  if (!canView) {
    redirect("/dashboard");
  }

  // Fetch initial contacts (Server-side)
  const contacts = await getContacts();

  // Extract role filter from URL param (Story 0.5: AC-0.5.3)
  const params = await searchParams;
  const validRoles: ContactRoleType[] = [
    "author",
    "customer",
    "vendor",
    "distributor",
  ];
  const initialRoleFilter =
    params.role && validRoles.includes(params.role as ContactRoleType)
      ? (params.role as ContactRoleType)
      : undefined;

  return (
    <div className="h-full">
      <ContactsSplitView
        initialContacts={contacts}
        initialRoleFilter={initialRoleFilter}
      />
    </div>
  );
}
