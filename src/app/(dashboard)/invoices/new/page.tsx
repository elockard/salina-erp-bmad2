import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { MANAGE_INVOICES } from "@/lib/permissions";
import { InvoiceForm } from "@/modules/invoices/components";

/**
 * New Invoice Page - Server Component
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.1: Route /invoices/new renders professional invoice creation form
 *
 * Permissions: Finance, Admin, Owner only
 */

export const metadata = {
  title: "New Invoice | Salina ERP",
  description: "Create a new customer invoice",
};

export default async function NewInvoicePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Check MANAGE_INVOICES permission
  const canManage = await hasPermission(MANAGE_INVOICES);
  if (!canManage) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <InvoiceForm />
    </div>
  );
}
