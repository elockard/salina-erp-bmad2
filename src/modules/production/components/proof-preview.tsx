"use client";

/**
 * Proof Preview Component
 *
 * Inline PDF viewer for the latest proof with fullscreen capability.
 *
 * Story: 18.4 - Upload and Manage Proof Files
 * AC-18.4.4: Preview latest proof inline with navigation (page up/down, zoom)
 *            and full-screen view capability
 */

import { Download, Expand, FileText, Loader2, Minimize } from "lucide-react";
import { useCallback, useState } from "react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ProofFileWithUrl } from "../types";

interface ProofPreviewProps {
  proof: ProofFileWithUrl | null;
  isLoading?: boolean;
}

export function ProofPreview({ proof, isLoading = false }: ProofPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    // Reset loading state when opening fullscreen
    if (!isFullscreen) {
      setIframeLoading(true);
    }
  }, [isFullscreen]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading proof...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!proof) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-50 mb-3" />
            <p className="text-sm">No proof available to preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PDFViewer = ({ className = "" }: { className?: string }) => (
    <div className={`relative ${className}`}>
      {iframeLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        src={proof.downloadUrl}
        className="w-full h-full border-0 rounded"
        title={`Proof v${proof.version} preview`}
        onLoad={handleIframeLoad}
      />
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Proof Preview</CardTitle>
                <Badge>v{proof.version}</Badge>
              </div>
              <CardDescription className="mt-1">
                {proof.fileName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={proof.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Expand className="mr-2 h-4 w-4" />
                Fullscreen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PDFViewer className="h-[500px]" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Use the PDF viewer controls to navigate pages and zoom
          </p>
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DialogTitle>Proof Preview</DialogTitle>
                <Badge>v{proof.version}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={proof.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                  <Minimize className="mr-2 h-4 w-4" />
                  Exit
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <PDFViewer className="h-[calc(95vh-100px)]" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
