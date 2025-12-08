import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { MANAGE_CONTRACTS } from "@/lib/permissions";
import { ContractDetail } from "@/modules/royalties/components/contract-detail";
import { getContractById } from "@/modules/royalties/queries";

/**
 * Contract Detail Page
 *
 * Displays full information about a specific royalty contract.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 1: Contract detail page accessible at /royalties/[id]
 * AC 2: Header displays author, title, status, dates
 * AC 9: Permission enforcement for edit actions
 *
 * Content:
 * - Contract header with author, title, status badge
 * - Advance tracking section with progress bar
 * - Royalty rate tables by format
 * - Contract statistics
 * - Edit and management actions
 */

export const metadata = {
  title: "Contract Details - Salina ERP",
};

interface ContractDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  // Check user authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get contract data (includes tenant_id check)
  const { id } = await params;
  const contract = await getContractById(id);

  // AC 1: 404 page shown if contract not found or belongs to different tenant
  if (!contract) {
    notFound();
  }

  // Check if user can edit (for rendering edit actions)
  const canEdit = await hasPermission(MANAGE_CONTRACTS);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation - AC 1 */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">Dashboard</span>
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <Link
          href="/royalties"
          className="hover:text-foreground transition-colors"
        >
          Royalty Contracts
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">
          {contract.author?.name ?? "Author"} - {contract.title.title}
        </span>
      </nav>

      {/* Contract Detail View */}
      <ContractDetail contract={contract} canEdit={canEdit} />
    </div>
  );
}
