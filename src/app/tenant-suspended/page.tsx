/**
 * Tenant Suspended Page
 *
 * Story 13.4: Implement Tenant Suspension and Reactivation
 * Task 8: Create Tenant Suspended Page
 * AC-13.4.4: Suspended tenant users see an "Account Suspended" message when trying to log in
 *
 * Displays a clear message to users of suspended tenants,
 * with contact support link for resolution.
 */

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Account Suspended | Salina ERP",
  description: "Your organization's account has been suspended.",
};

export default function TenantSuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-6 text-3xl font-bold text-white">
          Account Suspended
        </h1>
        <p className="mt-4 max-w-md text-slate-400">
          Your organization&apos;s account has been suspended. If you believe
          this is an error, please contact our support team.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
