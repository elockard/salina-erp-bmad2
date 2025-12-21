import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { ProductionBoard } from "@/modules/production/components";
import { getProductionBoard } from "@/modules/production/queries";

/**
 * Production Board Page - Server Component
 *
 * Story: 18.3 - Track Production Workflow Stages
 * AC-18.3.1: Kanban board with workflow stage columns
 * AC-18.3.7: Board accessible from Production navigation
 */

export const metadata = {
  title: "Production Board | Salina ERP",
  description: "Visual Kanban board for production workflow stages",
};

interface ProductionBoardPageProps {
  searchParams: Promise<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function ProductionBoardPage({
  searchParams,
}: ProductionBoardPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Authors role should not access this page
  if (user.role === "author") {
    redirect("/portal");
  }

  // Resolve search params (Next.js 15+)
  const params = await searchParams;

  // Build filters from search params
  const filters = {
    search: params.search,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  // Fetch board data (Server-side)
  const boardData = await getProductionBoard(filters);

  return (
    <>
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Production Board</h1>
        <p className="text-muted-foreground">
          Drag projects between stages to track workflow progress
        </p>
      </div>

      {/* Production Board */}
      <ProductionBoard initialData={boardData} />
    </>
  );
}
