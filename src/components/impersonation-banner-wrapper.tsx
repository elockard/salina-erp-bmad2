/**
 * Impersonation Banner Wrapper (RSC)
 *
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 2)
 *
 * Server component that checks impersonation status and conditionally
 * renders the client-side ImpersonationBanner with a spacer div to
 * prevent content from being hidden behind the fixed banner.
 */

import { getImpersonationStatus } from "@/modules/platform-admin/actions";
import { ImpersonationBanner } from "./impersonation-banner";

export async function ImpersonationBannerWrapper() {
  const status = await getImpersonationStatus();

  if (!status.isImpersonating) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed banner */}
      <div className="h-10" />
      <ImpersonationBanner
        impersonatedEmail={status.impersonatedEmail || "Unknown"}
        tenantName={status.tenantName || "Unknown Tenant"}
      />
    </>
  );
}
