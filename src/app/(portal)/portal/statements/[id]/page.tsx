import { notFound } from "next/navigation";
import { PortalStatementDetail } from "@/modules/statements/components/portal-statement-detail";
import { getMyStatementById } from "@/modules/statements/queries";

/**
 * Portal Statement Detail Page
 *
 * Story: 5.6 - Build Author Portal Statement Access
 * Task 5: Create statement detail page (AC: 3, 4)
 *
 * AC-5.6.3: Statement detail view matches PDF content structure
 * AC-5.6.4: Download PDF button
 * AC-5.6.5: Verify author ownership via getMyStatementById query
 */

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function PortalStatementDetailPage({ params }: Props) {
  const { id } = await params;

  // AC-5.6.5: Query enforces author ownership check
  const statement = await getMyStatementById(id);

  // Return 404 if statement not found or not owned by author
  if (!statement) {
    notFound();
  }

  return <PortalStatementDetail statement={statement} />;
}
