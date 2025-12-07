/**
 * ISBN Prefixes Settings Page
 *
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC-7.4.2: Prefix Settings Page at /settings/isbn-prefixes
 */

import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import {
  IsbnPrefixForm,
  IsbnPrefixTable,
} from "@/modules/isbn-prefixes/components";
import { getIsbnPrefixes } from "@/modules/isbn-prefixes/queries";

export const metadata = {
  title: "ISBN Prefixes | Settings",
  description: "Manage publisher ISBN prefixes for your organization",
};

async function PrefixList() {
  const result = await getIsbnPrefixes();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return <IsbnPrefixTable prefixes={result.data} />;
}

function PrefixListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export default async function IsbnPrefixesSettingsPage() {
  // Check permission (Admin/Owner only)
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const canManage = await hasPermission(MANAGE_SETTINGS);
  if (!canManage) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>ISBN Prefixes</CardTitle>
            <CardDescription>
              Register publisher ISBN prefixes to automatically generate ISBN
              blocks for your titles.
            </CardDescription>
          </div>
          <IsbnPrefixForm
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Prefix
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PrefixListSkeleton />}>
            <PrefixList />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About ISBN Prefixes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            ISBN prefixes are assigned by your ISBN agency (e.g., Bowker in the
            US). Each prefix identifies your organization as a publisher.
          </p>
          <p>
            When you register a prefix, the system automatically generates all
            possible ISBNs for that prefix with valid check digits. These ISBNs
            are then available for assignment to your titles.
          </p>
          <p>
            <strong>Block sizes:</strong> Choose based on your publishing
            volume. Larger blocks may take a few minutes to generate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
