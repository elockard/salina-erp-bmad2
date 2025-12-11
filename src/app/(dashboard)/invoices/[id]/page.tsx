import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { VIEW_INVOICES } from "@/lib/permissions";
import { getInvoiceWithDetails } from "@/modules/invoices/queries";
import { InvoiceDetailClient } from "./invoice-detail-client";

/**
 * Invoice Detail Page - Server Component
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.5: Invoice detail view with all sections
 * AC-8.3.6: Action buttons based on status
 *
 * Permissions: Finance, Admin, Owner only
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceWithDetails(id);

  return {
    title: invoice
      ? `Invoice ${invoice.invoice_number} | Salina ERP`
      : "Invoice Not Found | Salina ERP",
  };
}

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
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
  const invoice = await getInvoiceWithDetails(id);

  if (!invoice) {
    notFound();
  }

  // Get customer name
  const customer = invoice.customer as
    | { first_name: string; last_name: string }
    | undefined;
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`.trim()
    : "Unknown Customer";

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      {/* Invoice Detail Client */}
      <InvoiceDetailClient invoice={invoice} customerName={customerName} />
    </div>
  );
}
