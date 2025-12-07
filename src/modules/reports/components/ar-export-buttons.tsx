"use client";

/**
 * AR Export Buttons Component
 *
 * Buttons to export AR aging report data as CSV and PDF.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.6: CSV export with all aging data
 * AC-8.5.7: PDF export with company header
 *
 * Features:
 * - CSV export with proper headers and formatting
 * - PDF export with company name header
 * - Loading states while generating
 * - Disabled when no data
 */

import { format } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgingReportRow, TenantForReport } from "../types";

interface ARExportButtonsProps {
  /** Aging report data to export */
  data: AgingReportRow[];
  /** Tenant info for PDF header */
  tenant: TenantForReport | null;
  /** Whether export is disabled (no data) */
  disabled?: boolean;
}

/**
 * Generate CSV content from aging data
 * AC-8.5.6: Includes export timestamp
 */
function generateCSV(data: AgingReportRow[]): string {
  // AC-8.5.6: Add export timestamp
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const timestampRow = `"AR Aging Report - Generated: ${timestamp}"`;

  const headers = [
    "Customer",
    "Current",
    "1-30 Days",
    "31-60 Days",
    "61-90 Days",
    "90+ Days",
    "Total",
  ];

  const rows = data.map((row) => [
    `"${row.customerName.replace(/"/g, '""')}"`,
    row.current,
    row.days1to30,
    row.days31to60,
    row.days61to90,
    row.days90plus,
    row.total,
  ]);

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + (Number.parseFloat(row.current) || 0),
      days1to30: acc.days1to30 + (Number.parseFloat(row.days1to30) || 0),
      days31to60: acc.days31to60 + (Number.parseFloat(row.days31to60) || 0),
      days61to90: acc.days61to90 + (Number.parseFloat(row.days61to90) || 0),
      days90plus: acc.days90plus + (Number.parseFloat(row.days90plus) || 0),
      total: acc.total + (Number.parseFloat(row.total) || 0),
    }),
    { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 },
  );

  rows.push([
    "TOTAL",
    totals.current.toFixed(2),
    totals.days1to30.toFixed(2),
    totals.days31to60.toFixed(2),
    totals.days61to90.toFixed(2),
    totals.days90plus.toFixed(2),
    totals.total.toFixed(2),
  ]);

  // Include timestamp, then headers, then data rows
  return [timestampRow, "", headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate simple PDF content (HTML to print)
 */
function generatePDFContent(
  data: AgingReportRow[],
  tenant: TenantForReport | null,
): string {
  const companyName = tenant?.name || "Company";
  const reportDate = format(new Date(), "MMMM d, yyyy");

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + (Number.parseFloat(row.current) || 0),
      days1to30: acc.days1to30 + (Number.parseFloat(row.days1to30) || 0),
      days31to60: acc.days31to60 + (Number.parseFloat(row.days31to60) || 0),
      days61to90: acc.days61to90 + (Number.parseFloat(row.days61to90) || 0),
      days90plus: acc.days90plus + (Number.parseFloat(row.days90plus) || 0),
      total: acc.total + (Number.parseFloat(row.total) || 0),
    }),
    { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 },
  );

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? Number.parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num || 0);
  };

  const rowsHtml = data
    .map(
      (row) => `
      <tr>
        <td>${row.customerName}</td>
        <td class="amount">${formatCurrency(row.current)}</td>
        <td class="amount">${formatCurrency(row.days1to30)}</td>
        <td class="amount">${formatCurrency(row.days31to60)}</td>
        <td class="amount">${formatCurrency(row.days61to90)}</td>
        <td class="amount">${formatCurrency(row.days90plus)}</td>
        <td class="amount total">${formatCurrency(row.total)}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AR Aging Report - ${companyName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #1e3a5f; margin-bottom: 5px; }
        .report-date { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #1e3a5f; color: white; }
        .amount { text-align: right; font-family: monospace; }
        .total { font-weight: bold; }
        .totals-row { background-color: #f5f5f5; font-weight: bold; }
        @media print {
          body { margin: 20px; }
          th { background-color: #1e3a5f !important; color: white !important; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>${companyName}</h1>
      <div class="report-date">AR Aging Report - ${reportDate}</div>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Current</th>
            <th>1-30 Days</th>
            <th>31-60 Days</th>
            <th>61-90 Days</th>
            <th>90+ Days</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="totals-row">
            <td>TOTAL</td>
            <td class="amount">${formatCurrency(totals.current)}</td>
            <td class="amount">${formatCurrency(totals.days1to30)}</td>
            <td class="amount">${formatCurrency(totals.days31to60)}</td>
            <td class="amount">${formatCurrency(totals.days61to90)}</td>
            <td class="amount">${formatCurrency(totals.days90plus)}</td>
            <td class="amount total">${formatCurrency(totals.total)}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;
}

export function ARExportButtons({
  data,
  tenant,
  disabled = false,
}: ARExportButtonsProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportType, setExportType] = React.useState<"csv" | "pdf" | null>(null);

  const handleExportCSV = async () => {
    if (data.length === 0) return;

    setIsExporting(true);
    setExportType("csv");

    try {
      const csv = generateCSV(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ar-aging-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[Export CSV] Error:", error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return;

    setIsExporting(true);
    setExportType("pdf");

    try {
      const html = generatePDFContent(data, tenant);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Use setTimeout to ensure print is called after content is ready
        // This avoids race condition where onload might fire before handler is attached
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error("[Export PDF] Error:", error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const isDisabled = disabled || data.length === 0 || isExporting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isDisabled} data-testid="ar-export-button">
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting {exportType?.toUpperCase()}...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} data-testid="ar-export-csv">
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} data-testid="ar-export-pdf">
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
