/**
 * Production Status Badge Component
 *
 * Displays production project status with color coding.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.2: Status display (draft, in-progress, completed, cancelled)
 */

import { Badge } from "@/components/ui/badge";
import {
  PRODUCTION_STATUS,
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "../schema";

const statusVariants: Record<
  ProductionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [PRODUCTION_STATUS.DRAFT]: "secondary",
  [PRODUCTION_STATUS.IN_PROGRESS]: "default",
  [PRODUCTION_STATUS.COMPLETED]: "outline",
  [PRODUCTION_STATUS.CANCELLED]: "destructive",
};

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  className?: string;
}

export function ProductionStatusBadge({
  status,
  className,
}: ProductionStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} className={className}>
      {PRODUCTION_STATUS_LABELS[status]}
    </Badge>
  );
}
