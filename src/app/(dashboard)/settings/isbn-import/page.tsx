import { requirePermission } from "@/lib/auth";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import { IsbnImportForm } from "@/modules/isbn/components/isbn-import-form";

export const metadata = {
  title: "ISBN Import | Salina ERP",
  description: "Import ISBNs from CSV file to your publisher inventory pool",
};

/**
 * ISBN Import page - Server Component
 *
 * AC 1: Route /settings/isbn-import renders import interface
 * - Permission check enforces MANAGE_SETTINGS (owner, admin only)
 * - Unauthorized users get UNAUTHORIZED error (handled by error boundary)
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 */
export default async function IsbnImportPage() {
  // Permission check: only Owner/Admin can access (AC 1)
  await requirePermission(MANAGE_SETTINGS);

  return (
    <div>
      <p className="text-muted-foreground mb-6">
        Import ISBNs from a CSV file to add them to your inventory pool. Each
        ISBN must be a valid ISBN-13 format (13 digits starting with 978 or
        979).
      </p>
      <IsbnImportForm />
    </div>
  );
}
