"use client";

/**
 * Contract Detail Component
 *
 * Main component for displaying contract details.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 2: Contract header displays key information
 * AC 6: Actions section provides management capabilities
 */

import { ArrowLeft, DollarSign, Edit } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractWithRelations } from "../types";
import { ContractAdvanceModal } from "./contract-advance-modal";
import { ContractAdvanceSection } from "./contract-advance-section";
import { ContractEditModal } from "./contract-edit-modal";
import { ContractStatsSection } from "./contract-stats-section";
import { ContractStatusDropdown } from "./contract-status-dropdown";
import { ContractTiersSection } from "./contract-tiers-section";

/**
 * Status badge styling mapping
 * AC 2: Status badge with color coding
 */
const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "secondary" },
  terminated: { label: "Terminated", variant: "destructive" },
};

interface ContractDetailProps {
  contract: ContractWithRelations;
  canEdit: boolean;
}

export function ContractDetail({ contract, canEdit }: ContractDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  const statusBadge = STATUS_BADGES[contract.status] || STATUS_BADGES.active;

  // Format dates for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Contract Header - AC 2 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Title and Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">
                  {contract.author.name} - {contract.title.title}
                </CardTitle>
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>
              {/* Metadata row */}
              <p className="text-sm text-muted-foreground">
                Created {formatDate(contract.created_at)} &bull; Last updated{" "}
                {formatDate(contract.updated_at)}
              </p>
            </div>

            {/* Actions - AC 6 */}
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/royalties">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Contract
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAdvanceModalOpen(true)}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Update Advance
                  </Button>
                  <ContractStatusDropdown
                    contractId={contract.id}
                    currentStatus={
                      contract.status as "active" | "suspended" | "terminated"
                    }
                  />
                </>
              )}

              {!canEdit && (
                <p className="text-sm text-muted-foreground italic">
                  View only - editing requires Editor role
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Advance Tracking - AC 3 */}
        <ContractAdvanceSection contract={contract} />

        {/* Contract Statistics - AC 5 */}
        <ContractStatsSection contractId={contract.id} />
      </div>

      {/* Royalty Rate Tables - AC 4 */}
      <ContractTiersSection tiers={contract.tiers} />

      {/* Edit Contract Modal - AC 7 */}
      {canEdit && (
        <>
          <ContractEditModal
            contract={contract}
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
          />
          <ContractAdvanceModal
            contract={contract}
            open={isAdvanceModalOpen}
            onOpenChange={setIsAdvanceModalOpen}
          />
        </>
      )}
    </div>
  );
}
