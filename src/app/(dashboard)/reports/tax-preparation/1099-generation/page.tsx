/**
 * 1099 Generation Page
 *
 * Page for generating 1099-MISC forms for eligible authors.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.1: Display authors meeting $600 threshold
 * AC-11.3.2: Validate US-based and tax info requirements
 * AC-11.3.3: Batch generation capability
 * AC-11.3.4: Download generated forms
 *
 * Permission: owner, admin, finance (NOT editor, NOT author)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import {
  get1099StatsAction,
  getAuthors1099InfoAction,
} from "@/modules/form-1099/actions";
import { Form1099GenerationClient } from "@/modules/form-1099/components/form-1099-generation-client";
import { Form1099Stats } from "@/modules/form-1099/components/form-1099-stats";

export const dynamic = "force-dynamic";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

function TableSkeleton() {
  return <Skeleton className="h-96" />;
}

async function StatsSection({ year }: { year: number }) {
  const result = await get1099StatsAction(year);

  if (!result.success) {
    return (
      <div className="text-destructive">
        Failed to load statistics: {result.error}
      </div>
    );
  }

  return <Form1099Stats stats={result.data} year={year} />;
}

async function GenerationSection({ year }: { year: number }) {
  const result = await getAuthors1099InfoAction(year);

  if (!result.success) {
    return (
      <div className="text-destructive">
        Failed to load author data: {result.error}
      </div>
    );
  }

  return (
    <Form1099GenerationClient initialData={result.data} initialYear={year} />
  );
}

export default async function Form1099GenerationPage() {
  // AC-11.3: Only Finance, Admin, Owner can access
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  // Default to previous calendar year (typically filing for prior year)
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 1;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            1099-MISC Generation
          </h1>
          <p className="text-muted-foreground">
            Generate IRS 1099-MISC forms for eligible authors
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection year={defaultYear} />
      </Suspense>

      {/* Author Table and Generation Controls */}
      <Suspense fallback={<TableSkeleton />}>
        <GenerationSection year={defaultYear} />
      </Suspense>
    </div>
  );
}
