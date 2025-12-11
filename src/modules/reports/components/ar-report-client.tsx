"use client";

/**
 * AR Report Client Component
 *
 * Client-side wrapper for AR report interactive features.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.4: Customer drill-down showing invoices and payment history
 *
 * Handles:
 * - Customer click/drill-down state
 * - Loading customer detail asynchronously
 */

import * as React from "react";
import { getCustomerARDetail as fetchCustomerDetail } from "../actions";
import type {
  AgingReportRow,
  CustomerARDetail,
  TenantForReport,
} from "../types";
import { ARAgingChart } from "./ar-aging-chart";
import { ARAgingTable } from "./ar-aging-table";
import { ARCustomerDetail } from "./ar-customer-detail";
import { ARExportButtons } from "./ar-export-buttons";

interface ARReportClientProps {
  /** Initial aging report data */
  agingData: AgingReportRow[];
  /** Tenant info for export */
  tenant: TenantForReport | null;
}

export function ARReportClient({ agingData, tenant }: ARReportClientProps) {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<
    string | null
  >(null);
  const [customerDetail, setCustomerDetail] =
    React.useState<CustomerARDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  // Load customer detail when selected
  const handleCustomerClick = React.useCallback(async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsDetailLoading(true);
    setCustomerDetail(null);
    setDetailError(null);

    try {
      const result = await fetchCustomerDetail(customerId);
      if (result.success && result.data) {
        setCustomerDetail(result.data);
      } else {
        setDetailError("Failed to load customer details. Please try again.");
      }
    } catch (error) {
      console.error("[AR Report] Failed to load customer detail:", error);
      setDetailError("Failed to load customer details. Please try again.");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = React.useCallback(() => {
    setSelectedCustomerId(null);
    setCustomerDetail(null);
  }, []);

  return (
    <>
      {/* Chart and Export Row */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <ARAgingChart data={agingData} variant="summary" height={300} />
        </div>
        <div className="lg:w-80 flex flex-col gap-4">
          <div className="flex justify-end">
            <ARExportButtons
              data={agingData}
              tenant={tenant}
              disabled={agingData.length === 0 || !tenant}
            />
          </div>
          {agingData.length > 5 && (
            <ARAgingChart data={agingData} variant="byCustomer" height={250} />
          )}
        </div>
      </div>

      {/* Aging Table */}
      <ARAgingTable
        data={agingData}
        isLoading={false}
        onCustomerClick={handleCustomerClick}
      />

      {/* Customer Detail Panel */}
      <ARCustomerDetail
        data={customerDetail}
        isOpen={selectedCustomerId !== null}
        onClose={handleCloseDetail}
        isLoading={isDetailLoading}
        error={detailError}
      />
    </>
  );
}
