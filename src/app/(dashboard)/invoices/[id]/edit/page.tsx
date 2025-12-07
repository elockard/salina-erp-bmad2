import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { VIEW_INVOICES } from "@/lib/permissions";
import { getInvoiceForEdit } from "@/modules/invoices/queries";
import { InvoiceEditForm } from "./invoice-edit-form";

/**
 * Invoice Edit Page - Server Component
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.7: Edit invoice (draft only)
 *
 * Only draft invoices can be edited. Non-draft invoices redirect to detail view.
 *
 * Permissions: Finance, Admin, Owner only
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceForEdit(id);

  return {
    title: invoice
      ? `Edit Invoice ${invoice.invoice_number} | Salina ERP`
      : "Invoice Not Found | Salina ERP",
  };
}

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceEditPage({
  params,
}: InvoiceEditPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Check VIEW_INVOICES permission
  const canView = await hasPermission(VIEW_INVOICES);
  if (!canView) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invoice = await getInvoiceForEdit(id);

  // If invoice not found or not draft, redirect to detail page
  if (!invoice) {
    // Could be not found or not draft
    // Check if invoice exists at all for better UX
    redirect(`/invoices/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/invoices/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Invoice {invoice.invoice_number}</CardTitle>
          <CardDescription>
            Modify the draft invoice details. Only draft invoices can be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceEditForm invoice={invoice} />
        </CardContent>
      </Card>
    </div>
  );
}
