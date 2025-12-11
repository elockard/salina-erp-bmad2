import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { VIEW_INVOICES } from "@/lib/permissions";
import { InvoiceListClient } from "@/modules/invoices/components";
import {
  countInvoices,
  getInvoicesWithCustomer,
} from "@/modules/invoices/queries";
import type { InvoiceStatusType } from "@/modules/invoices/types";

/**
 * Invoices List Page - Server Component
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.1: Invoice list view with table
 * AC-8.3.2: Filters for status, customer, date range
 * AC-8.3.10: Empty state with CTA
 *
 * Permissions: Finance, Admin, Owner only
 */

export const metadata = {
  title: "Invoices | Salina ERP",
  description: "Manage invoices for your publishing company",
};

interface InvoicesPageProps {
  searchParams: Promise<{
    status?: string;
    customer?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
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

  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = parseInt(params.pageSize || "25", 10);
  const offset = (page - 1) * pageSize;

  // Build filter options
  const filterOptions = {
    status: params.status as InvoiceStatusType | undefined,
    customerId: params.customer || undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    limit: pageSize,
    offset,
  };

  // Fetch data
  const [invoices, totalCount] = await Promise.all([
    getInvoicesWithCustomer(filterOptions),
    countInvoices(filterOptions),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage customer invoices
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Invoice List Client Component */}
      <InvoiceListClient
        initialInvoices={invoices}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
