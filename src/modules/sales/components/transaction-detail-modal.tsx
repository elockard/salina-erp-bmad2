"use client";

/**
 * Transaction Detail Modal Component
 *
 * Displays full transaction details on row click.
 * Story 3.3: AC 6 (transaction detail modal)
 *
 * Features:
 * - Full transaction data display
 * - Audit trail (recorded by, recorded at)
 * - Related title information
 * - Immutability notice
 * - Click-outside-to-close (built into Dialog)
 */

import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  DollarSign,
  Hash,
  Info,
  Truck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { SaleWithRelations } from "../types";

interface TransactionDetailModalProps {
  sale: SaleWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Format labels for display
 */
const formatLabels: Record<string, string> = {
  physical: "Physical Book",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

const channelLabels: Record<string, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  direct: "Direct",
  distributor: "Distributor",
};

/**
 * Detail row component for consistent styling
 */
function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ""}`}>
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function TransactionDetailModal({
  sale,
  open,
  onOpenChange,
}: TransactionDetailModalProps) {
  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Sale recorded on {format(new Date(sale.sale_date), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Information */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Title Information
            </h4>
            <div className="space-y-2">
              <p className="font-medium">{sale.title.title}</p>
              <p className="text-sm text-muted-foreground">
                by {sale.title.author_name}
              </p>
              <Badge variant="secondary">{formatLabels[sale.format]}</Badge>
            </div>
          </div>

          {/* Sale Details */}
          <div className="grid gap-4">
            <DetailRow
              icon={Hash}
              label="Quantity"
              value={`${sale.quantity} units`}
            />
            <DetailRow
              icon={DollarSign}
              label="Unit Price"
              value={formatCurrency(sale.unit_price)}
            />
            <DetailRow
              icon={DollarSign}
              label="Total Amount"
              value={
                <span className="text-lg font-bold">
                  {formatCurrency(sale.total_amount)}
                </span>
              }
            />
            <DetailRow
              icon={Truck}
              label="Sales Channel"
              value={
                <Badge variant="outline">{channelLabels[sale.channel]}</Badge>
              }
            />
          </div>

          <Separator />

          {/* Audit Trail */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Audit Trail
            </h4>
            <div className="space-y-3">
              <DetailRow
                icon={User}
                label="Recorded By"
                value={sale.createdBy.name}
              />
              <DetailRow
                icon={Calendar}
                label="Recorded At"
                value={format(
                  new Date(sale.created_at),
                  "MMM d, yyyy 'at' h:mm a",
                )}
              />
            </div>
          </div>

          {/* Immutability Notice */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Immutable Record
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  This transaction cannot be modified or deleted (immutable
                  ledger). If adjustments are needed, record a return instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
