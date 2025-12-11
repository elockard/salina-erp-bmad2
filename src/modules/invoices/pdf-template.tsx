/**
 * Invoice PDF Template
 *
 * React-PDF template for rendering professional invoice PDFs.
 * Uses @react-pdf/renderer for PDF generation.
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 2: Create Invoice PDF Template
 * AC-8.6.1: Invoice PDF Layout
 *
 * Layout structure:
 * - Header: Company logo placeholder, name, address
 * - Invoice title with number and date
 * - Bill-to and Ship-to addresses
 * - Line items table (professional formatting)
 * - Subtotal, Tax, Shipping, Total
 * - Payment terms and due date
 * - Notes section (customer-facing)
 * - Footer: Thank you message
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { InvoiceAddress, InvoicePDFData } from "./types";

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333333",
  },
  // Header section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companySection: {
    maxWidth: 250,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.4,
  },
  invoiceSection: {
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  invoiceMeta: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  invoiceMetaValue: {
    fontWeight: "bold",
    color: "#333333",
  },
  // Address section
  addressSection: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 40,
  },
  addressBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.5,
  },
  // Line items table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontWeight: "bold",
    fontSize: 9,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 10,
    color: "#333333",
  },
  // Column widths
  colItem: { width: "12%" },
  colDescription: { width: "38%" },
  colQty: { width: "12%", textAlign: "center" },
  colUnitPrice: { width: "18%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  // Totals section
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666666",
  },
  totalValue: {
    fontSize: 10,
    color: "#333333",
    fontWeight: "bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#1a1a1a",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "bold",
  },
  // Payment terms
  termsSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  termsLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  termsValue: {
    fontSize: 10,
    color: "#333333",
  },
  // Notes section
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 15,
  },
  footerText: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  footerThankYou: {
    fontSize: 11,
    color: "#333333",
    fontWeight: "bold",
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format address as multi-line string
 */
function formatAddress(address: InvoiceAddress | null): string {
  if (!address) return "";

  const lines: string[] = [];
  if (address.line1) lines.push(address.line1);
  if (address.line2) lines.push(address.line2);

  const cityStateZip = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) lines.push(cityStateZip);

  if (
    address.country &&
    address.country !== "USA" &&
    address.country !== "US"
  ) {
    lines.push(address.country);
  }

  return lines.join("\n");
}

/**
 * Format payment terms for display
 */
function formatPaymentTerms(terms: string): string {
  switch (terms) {
    case "net_30":
      return "Net 30 - Payment due within 30 days";
    case "net_60":
      return "Net 60 - Payment due within 60 days";
    case "due_on_receipt":
      return "Due on Receipt - Payment due immediately";
    case "custom":
      return "Custom Terms - See notes below";
    default:
      return terms;
  }
}

// =============================================================================
// PDF Components
// =============================================================================

/**
 * Invoice PDF Document Component
 *
 * Renders a complete invoice PDF with all sections per AC-8.6.1
 */
export function InvoicePDFDocument({ data }: { data: InvoicePDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with company and invoice info */}
        <View style={styles.header}>
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            {data.company.address && (
              <Text style={styles.companyAddress}>{data.company.address}</Text>
            )}
          </View>
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>
              Invoice #:{" "}
              <Text style={styles.invoiceMetaValue}>{data.invoiceNumber}</Text>
            </Text>
            <Text style={styles.invoiceMeta}>
              Date:{" "}
              <Text style={styles.invoiceMetaValue}>
                {format(data.invoiceDate, "MMM d, yyyy")}
              </Text>
            </Text>
            <Text style={styles.invoiceMeta}>
              Due Date:{" "}
              <Text style={styles.invoiceMetaValue}>
                {format(data.dueDate, "MMM d, yyyy")}
              </Text>
            </Text>
          </View>
        </View>

        {/* Bill-to and Ship-to addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Bill To</Text>
            <Text style={styles.addressText}>{data.customer.name}</Text>
            <Text style={styles.addressText}>
              {formatAddress(data.billToAddress)}
            </Text>
            {data.customer.email && (
              <Text style={styles.addressText}>{data.customer.email}</Text>
            )}
          </View>
          {data.shipToAddress && (
            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>Ship To</Text>
              <Text style={styles.addressText}>
                {formatAddress(data.shipToAddress)}
              </Text>
            </View>
          )}
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
              Amount
            </Text>
          </View>

          {/* Table rows */}
          {data.lineItems.map((item, index) => (
            <View
              key={item.lineNumber}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.colItem]}>
                {item.itemCode || "-"}
              </Text>
              <Text style={[styles.tableCell, styles.colDescription]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.colUnitPrice]}>
                ${item.unitPrice}
              </Text>
              <Text style={[styles.tableCell, styles.colAmount]}>
                ${item.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${data.subtotal}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({data.taxRate})</Text>
              <Text style={styles.totalValue}>${data.taxAmount}</Text>
            </View>
            {Number.parseFloat(data.shippingCost) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>${data.shippingCost}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Due</Text>
              <Text style={styles.grandTotalValue}>${data.total}</Text>
            </View>
          </View>
        </View>

        {/* Payment terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsLabel}>Payment Terms</Text>
          <Text style={styles.termsValue}>
            {formatPaymentTerms(data.paymentTerms)}
          </Text>
        </View>

        {/* Notes (if present) */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerThankYou}>
            Thank you for your business!
          </Text>
          <Text style={styles.footerText}>
            Please remit payment by the due date shown above.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Render invoice PDF to buffer
 *
 * @param data - Invoice PDF data
 * @returns PDF as Buffer
 */
export async function renderInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const buffer = await renderToBuffer(<InvoicePDFDocument data={data} />);
  return Buffer.from(buffer);
}
