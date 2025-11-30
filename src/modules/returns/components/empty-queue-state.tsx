"use client";

/**
 * Empty Queue State Component
 *
 * Empty state display when no pending returns exist.
 * Story 3.6: AC 9 (empty state when no pending returns)
 *
 * Features:
 * - Icon and message: "No pending returns"
 * - Subtitle: "All return requests have been processed"
 * - Link to returns history: "View all returns"
 */

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyQueueState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Success Icon */}
      <div className="mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
      </div>

      {/* Message */}
      <h3 className="text-xl font-semibold mb-2">No pending returns</h3>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-6">
        All return requests have been processed
      </p>

      {/* Link to history (AC 9) */}
      <Button variant="outline" asChild>
        <Link href="/returns">View all returns</Link>
      </Button>
    </div>
  );
}
