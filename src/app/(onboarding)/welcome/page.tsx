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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-2xl rounded-lg border border-slate-200 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight text-[#1E3A5F]">
            Welcome to Salina ERP!
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Your workspace{" "}
            <span className="font-medium text-[#1E3A5F]">{tenant?.name}</span>{" "}
            is ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-md bg-slate-100 p-4">
            <h3 className="font-medium text-slate-900">Getting Started</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Your account has been created successfully</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>
                  Your workspace is available at{" "}
                  <span className="font-mono text-xs">
                    {tenant?.subdomain}.salina-erp.com
                  </span>
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">→</span>
                <span>
                  Next: Continue to your dashboard to start managing your
                  publishing business
                </span>
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

          <div className="mt-6 space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">What's Next?</p>
            <p>
              This welcome page is a placeholder for Story 1.4. The full
              role-based dashboard with navigation and module access will be
              implemented in Story 1.8.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
