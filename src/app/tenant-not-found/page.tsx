/**
 * Tenant Not Found Page
 *
 * Story 13.4: Updated to dark slate theme for consistency with platform-admin area
 *
 * Displays when a subdomain doesn't match any registered tenant.
 */

import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Tenant Not Found | Salina ERP",
  description: "The subdomain you're trying to access doesn't exist.",
};

export default function TenantNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 text-3xl font-bold text-white">Tenant Not Found</h1>
        <p className="mt-4 max-w-md text-slate-400">
          The subdomain you&apos;re trying to access doesn&apos;t exist.
        </p>
      </div>
    </div>
  );
}
