"use client";

/**
 * Proof Section Component
 *
 * Combined component for proof file management in project detail view.
 * Includes upload form, version list, latest proof preview, and approval actions.
 *
 * Story: 18.4 - Upload and Manage Proof Files
 * AC-18.4.1-8: Complete proof file management UI
 *
 * Story: 18.5 - Approve or Request Corrections on Proofs
 * AC-18.5.1-2: Approval action buttons with dialogs
 */

import { ChevronDown, ChevronUp, FileCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { getLatestProof, getProofFileSummary, getProofFiles } from "../queries";
import type { WorkflowStage } from "../schema";
import type { ProofFileSummary, ProofFileWithUrl } from "../types";
import { ProofApprovalActions } from "./proof-approval-actions";
import { ProofPreview } from "./proof-preview";
import { ProofUploadForm } from "./proof-upload-form";
import { ProofVersionList } from "./proof-version-list";

interface ProofSectionProps {
  projectId: string;
  workflowStage?: WorkflowStage;
  canDelete?: boolean;
}

export function ProofSection({
  projectId,
  workflowStage,
  canDelete = false,
}: ProofSectionProps) {
  const [proofs, setProofs] = useState<ProofFileWithUrl[]>([]);
  const [latestProof, setLatestProof] = useState<ProofFileWithUrl | null>(null);
  const [summary, setSummary] = useState<ProofFileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  const isProofStage = workflowStage === "proof";

  /**
   * Load proof data from server
   */
  const loadProofData = useCallback(async () => {
    try {
      const [proofsData, latestData, summaryData] = await Promise.all([
        getProofFiles(projectId),
        getLatestProof(projectId),
        getProofFileSummary(projectId),
      ]);

      setProofs(proofsData);
      setLatestProof(latestData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading proof data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load data on mount
  useEffect(() => {
    loadProofData();
  }, [loadProofData]);

  /**
   * Handle successful upload - refresh data
   */
  const handleUploadSuccess = useCallback(() => {
    loadProofData();
  }, [loadProofData]);

  /**
   * Handle refresh after edit/delete
   */
  const handleRefresh = useCallback(() => {
    loadProofData();
  }, [loadProofData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading proofs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <Card className={isProofStage ? "border-blue-300" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck
                className={`h-5 w-5 ${
                  isProofStage ? "text-blue-600" : "text-muted-foreground"
                }`}
              />
              <CardTitle className="text-base">Proof Files</CardTitle>
              {summary && summary.totalVersions > 0 && (
                <Badge variant="secondary">
                  {summary.totalVersions} versions
                </Badge>
              )}
            </div>
            {isProofStage && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                Active Stage
              </Badge>
            )}
          </div>
          <CardDescription>
            {isProofStage
              ? "Project is in proof stage. Upload and review proofs here."
              : "Upload and manage proof file versions for this project."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Upload Form */}
      <ProofUploadForm
        projectId={projectId}
        isProofStage={isProofStage}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Latest Proof Preview with Approval Actions */}
      {latestProof && (
        <>
          <ProofPreview proof={latestProof} />
          {/* AC-18.5.1-2: Approval buttons shown when in proof stage */}
          <ProofApprovalActions
            proof={latestProof}
            isProofStage={isProofStage}
            onActionComplete={handleRefresh}
          />
        </>
      )}

      {/* Version History (Collapsible) */}
      {proofs.length > 0 && (
        <Card>
          <Collapsible open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-between p-0 hover:bg-transparent"
                >
                  <CardTitle className="text-base">Version History</CardTitle>
                  {isVersionsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ProofVersionList
                  proofs={proofs}
                  canDelete={canDelete}
                  onRefresh={handleRefresh}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
