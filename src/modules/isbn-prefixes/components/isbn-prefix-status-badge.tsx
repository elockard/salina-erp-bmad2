"use client";

/**
 * ISBN Prefix Status Badge
 *
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC-7.4.4: Status badge (generating/completed/failed)
 */

import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IsbnPrefixGenerationStatus } from "../types";

interface IsbnPrefixStatusBadgeProps {
  status: IsbnPrefixGenerationStatus;
  error?: string | null;
}

export function IsbnPrefixStatusBadge({
  status,
  error,
}: IsbnPrefixStatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "generating":
      return (
        <Badge variant="default" className="gap-1 bg-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="destructive"
          className="gap-1"
          title={error || "Generation failed"}
        >
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
