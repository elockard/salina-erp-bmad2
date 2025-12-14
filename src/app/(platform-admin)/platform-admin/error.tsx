"use client";

/**
 * Platform Admin Error Boundary
 *
 * Story 13.5: Build Platform Analytics Dashboard
 *
 * Error boundary shown when dashboard fails to load.
 */

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <div className="mx-auto max-w-6xl text-center">
      <h2 className="text-xl font-bold text-white">Failed to load dashboard</h2>
      <p className="mt-2 text-slate-400">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        Try Again
      </Button>
    </div>
  );
}
