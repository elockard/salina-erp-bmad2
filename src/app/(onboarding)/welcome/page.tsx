/**
 * Welcome Page
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.1: New Tenant Wizard Trigger
 *
 * Updated to check onboarding status and redirect accordingly
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import { shouldShowOnboarding } from "@/modules/onboarding/queries";

export default async function WelcomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user and tenant info
  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
    with: {
      tenant: true,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, user.tenant_id),
  });

  // AC 20.1.1: Check if onboarding should be shown
  const showOnboarding = await shouldShowOnboarding();

  // Redirect to onboarding wizard if not completed
  if (showOnboarding) {
    redirect("/onboarding");
  }

  // Otherwise show welcome page (for returning users)
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-2xl rounded-lg border border-slate-200 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight text-[#1E3A5F]">
            Welcome Back to Salina ERP!
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Your workspace{" "}
            <span className="font-medium text-[#1E3A5F]">{tenant?.name}</span>{" "}
            is ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-md bg-slate-100 p-4">
            <h3 className="font-medium text-slate-900">Quick Actions</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start">
                <span className="mr-2">→</span>
                <span>View your dashboard and recent activity</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">→</span>
                <span>Manage your titles and authors</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">→</span>
                <span>Generate royalty statements</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center">
            <Button
              asChild
              className="bg-[#1E3A5F] hover:bg-[#152d47] rounded-md"
              size="lg"
            >
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
