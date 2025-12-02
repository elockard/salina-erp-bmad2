/**
 * Inngest Dashboard Link Component
 *
 * External link to Inngest dashboard for detailed job monitoring.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.6: Link to Inngest dashboard provided for detailed monitoring
 *
 * Related:
 * - src/modules/admin/queries.ts (getInngestDashboardUrl)
 * - src/app/(dashboard)/admin/system/page.tsx (consumer)
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInngestDashboardUrl } from "../queries";

interface InngestLinkProps {
  /** Optional variant for button styling */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Optional size for button */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Inngest Dashboard Link Button
 * AC-6.6.6: Link to Inngest dashboard provided for detailed monitoring
 *
 * Opens Inngest dashboard in new tab with proper rel attributes for security.
 */
export function InngestLink({
  variant = "outline",
  size = "default",
}: InngestLinkProps) {
  const dashboardUrl = getInngestDashboardUrl();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            asChild
            data-testid="inngest-dashboard-link"
          >
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Inngest Dashboard
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View detailed job logs and analytics in Inngest</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
