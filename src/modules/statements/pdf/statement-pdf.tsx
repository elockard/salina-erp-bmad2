/**
 * Statement PDF Template
 *
 * React PDF template for generating royalty statements.
 * Uses @react-pdf/renderer to create professional PDF documents.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * AC-5.2.1: Company logo placeholder, period dates, author information
 * AC-5.2.2: Summary section with net payable, gross royalties, recoupment
 * AC-5.2.3: Sales breakdown table with title, format, units, rate, royalty
 * AC-5.2.4: Returns section (conditional)
 * AC-5.2.5: Advance recoupment section
 *
 * Related:
 * - src/modules/statements/types.ts (StatementCalculations)
 * - src/modules/statements/pdf-generator.ts (renderToBuffer)
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { StatementPDFData } from "../types";

/**
 * PDF Styles
 * Professional document styling for royalty statements
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333333",
  },
  // Header styles
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoPlaceholder: {
    width: 80,
    height: 40,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 8,
    color: "#6b7280",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 4,
  },
  periodText: {
    fontSize: 11,
    color: "#4b5563",
  },
  periodDates: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  // Author info styles
  authorSection: {
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  authorName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  authorAddress: {
    fontSize: 10,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  // Summary section styles
  summarySection: {
    marginBottom: 20,
    backgroundColor: "#eff6ff",
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#374151",
  },
  summaryValue: {
    fontSize: 10,
    color: "#374151",
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: "#93c5fd",
    marginVertical: 8,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
  },
  // Table styles
  tableSection: {
    marginBottom: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    color: "#4b5563",
  },
  // Column widths for sales breakdown
  colTitle: { width: "30%" },
  colFormat: { width: "15%" },
  colUnits: { width: "15%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colRoyalty: { width: "25%", textAlign: "right" },
  // Recoupment section styles
  recoupmentSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#fefce8",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fde047",
  },
  recoupmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  recoupmentLabel: {
    fontSize: 9,
    color: "#713f12",
  },
  recoupmentValue: {
    fontSize: 9,
    color: "#713f12",
  },
  // Returns section styles
  returnsSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  returnsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#991b1b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Co-Author section styles (Story 10.3: AC-10.3.4)
  coAuthorSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#dbeafe",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  coAuthorText: {
    fontSize: 11,
    color: "#1e40af",
    fontWeight: "bold",
  },
  // Lifetime sales section styles (Story 10.4: AC-10.4.6)
  lifetimeSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  lifetimeTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lifetimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  lifetimeLabel: {
    fontSize: 9,
    color: "#166534",
  },
  lifetimeValue: {
    fontSize: 9,
    color: "#166534",
    fontWeight: "bold",
  },
  lifetimeProgressContainer: {
    marginTop: 8,
    backgroundColor: "#dcfce7",
    borderRadius: 4,
    padding: 8,
  },
  lifetimeProgressLabel: {
    fontSize: 8,
    color: "#14532d",
    marginBottom: 4,
  },
  lifetimeProgressBar: {
    height: 8,
    backgroundColor: "#bbf7d0",
    borderRadius: 4,
    overflow: "hidden",
  },
  lifetimeProgressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 4,
  },
  // Footer styles
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
});

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format percentage value
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Header Component
 * AC-5.2.1: Company logo placeholder, period dates
 */
function Header({ data }: { data: StatementPDFData }) {
  const { period } = data.calculations;

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>[LOGO]</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.title}>ROYALTY STATEMENT</Text>
          <Text style={styles.periodText}>
            {formatDate(period.startDate)} - {formatDate(period.endDate)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Co-Author Section
 * Story 10.3: AC-10.3.4 - Shows ownership percentage for co-authored titles
 *
 * Renders "Your share: X% of [Title Name]" when splitCalculation is present.
 * Uses light blue background styling to highlight co-author context.
 */
function CoAuthorSection({ data }: { data: StatementPDFData }) {
  const splitCalc = data.calculations.splitCalculation;

  // Only render for split statements
  if (!splitCalc?.isSplitCalculation) {
    return null;
  }

  return (
    <View style={styles.coAuthorSection}>
      <Text style={styles.coAuthorText}>
        Your share: {splitCalc.ownershipPercentage}% of {data.titleName}
      </Text>
    </View>
  );
}

/**
 * Lifetime Sales Section
 * Story 10.4: AC-10.4.6 - Shows lifetime sales context for escalating royalty rates
 *
 * Displays lifetime sales before/after, current tier rate, and progress to next tier.
 * Only rendered when lifetimeContext is present (contract uses lifetime mode).
 */
function LifetimeSection({ data }: { data: StatementPDFData }) {
  const lifetimeCtx = data.calculations.lifetimeContext;

  // Only render for lifetime mode contracts
  if (!lifetimeCtx || lifetimeCtx.tierCalculationMode !== "lifetime") {
    return null;
  }

  // Calculate progress percentage to next tier
  const hasNextTier = lifetimeCtx.nextTierThreshold !== null;
  let progressPercent = 100;
  if (hasNextTier && lifetimeCtx.nextTierThreshold) {
    // Find the previous tier threshold (approximated from current position)
    // Progress = (current position - previous threshold) / (next threshold - previous threshold)
    // For simplicity, show as % toward next tier threshold
    progressPercent = Math.min(
      100,
      (lifetimeCtx.lifetimeSalesAfter / lifetimeCtx.nextTierThreshold) * 100,
    );
  }

  return (
    <View style={styles.lifetimeSection}>
      <Text style={styles.lifetimeTitle}>Lifetime Sales Progress</Text>

      <View style={styles.lifetimeRow}>
        <Text style={styles.lifetimeLabel}>Lifetime Sales Before Period</Text>
        <Text style={styles.lifetimeValue}>
          {lifetimeCtx.lifetimeSalesBefore.toLocaleString()} units
        </Text>
      </View>

      <View style={styles.lifetimeRow}>
        <Text style={styles.lifetimeLabel}>Lifetime Sales After Period</Text>
        <Text style={styles.lifetimeValue}>
          {lifetimeCtx.lifetimeSalesAfter.toLocaleString()} units
        </Text>
      </View>

      <View style={styles.lifetimeRow}>
        <Text style={styles.lifetimeLabel}>Current Tier Rate</Text>
        <Text style={styles.lifetimeValue}>
          {formatPercent(lifetimeCtx.currentTierRate)}
        </Text>
      </View>

      {hasNextTier && lifetimeCtx.unitsToNextTier !== null && (
        <View style={styles.lifetimeProgressContainer}>
          <Text style={styles.lifetimeProgressLabel}>
            {lifetimeCtx.unitsToNextTier.toLocaleString()} units to next tier (
            {lifetimeCtx.nextTierThreshold?.toLocaleString()} threshold)
          </Text>
          <View style={styles.lifetimeProgressBar}>
            <View
              style={[
                styles.lifetimeProgressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>
      )}

      {!hasNextTier && (
        <View style={styles.lifetimeProgressContainer}>
          <Text style={styles.lifetimeProgressLabel}>
            Highest tier reached - earning maximum rate
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Author Info Section
 * AC-5.2.1: Author information (name, address)
 */
function AuthorInfo({ data }: { data: StatementPDFData }) {
  const { author } = data;

  return (
    <View style={styles.authorSection}>
      <Text style={styles.sectionTitle}>Author Information</Text>
      <Text style={styles.authorName}>{author.name}</Text>
      {author.address && (
        <Text style={styles.authorAddress}>{author.address}</Text>
      )}
      {author.email && <Text style={styles.authorAddress}>{author.email}</Text>}
    </View>
  );
}

/**
 * Summary Section
 * AC-5.2.2: Net payable, gross royalties, recoupment amounts prominently
 */
function SummarySection({ data }: { data: StatementPDFData }) {
  const { calculations } = data;

  return (
    <View style={styles.summarySection}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Gross Royalties</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(calculations.grossRoyalty)}
        </Text>
      </View>
      {calculations.returnsDeduction > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Returns Deduction</Text>
          <Text style={styles.summaryValue}>
            ({formatCurrency(calculations.returnsDeduction)})
          </Text>
        </View>
      )}
      {calculations.advanceRecoupment.thisPeriodsRecoupment > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Advance Recoupment</Text>
          <Text style={styles.summaryValue}>
            (
            {formatCurrency(
              calculations.advanceRecoupment.thisPeriodsRecoupment,
            )}
            )
          </Text>
        </View>
      )}
      <View style={styles.summaryDivider} />
      <View style={styles.summaryTotal}>
        <Text style={styles.summaryTotalLabel}>NET PAYABLE</Text>
        <Text style={styles.summaryTotalValue}>
          {formatCurrency(calculations.netPayable)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Sales Breakdown Table
 * AC-5.2.3: Title, format, units sold, royalty rate, royalty earned
 */
function SalesBreakdown({ data }: { data: StatementPDFData }) {
  const { calculations, titleName } = data;

  // No sales to show
  if (calculations.formatBreakdowns.length === 0) {
    return null;
  }

  return (
    <View style={styles.tableSection}>
      <Text style={styles.sectionTitle}>Sales Breakdown</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colTitle]}>Title</Text>
          <Text style={[styles.tableHeaderCell, styles.colFormat]}>Format</Text>
          <Text style={[styles.tableHeaderCell, styles.colUnits]}>Units</Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderCell, styles.colRoyalty]}>
            Royalty
          </Text>
        </View>
        {calculations.formatBreakdowns.map((breakdown) => (
          <View style={styles.tableRow} key={`format-${breakdown.format}`}>
            <Text style={[styles.tableCell, styles.colTitle]}>{titleName}</Text>
            <Text style={[styles.tableCell, styles.colFormat]}>
              {breakdown.format.charAt(0).toUpperCase() +
                breakdown.format.slice(1)}
            </Text>
            <Text style={[styles.tableCell, styles.colUnits]}>
              {breakdown.totalQuantity.toLocaleString()}
            </Text>
            <Text style={[styles.tableCell, styles.colRate]}>
              {breakdown.tierBreakdowns.length > 0
                ? formatPercent(breakdown.tierBreakdowns[0].tierRate)
                : "-"}
            </Text>
            <Text style={[styles.tableCell, styles.colRoyalty]}>
              {formatCurrency(breakdown.formatRoyalty)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Returns Section
 * AC-5.2.4: Shows quantity, value, and impact on net royalty (if applicable)
 */
function ReturnsSection({ data }: { data: StatementPDFData }) {
  const { calculations } = data;

  // Only render if there are returns
  if (calculations.returnsDeduction <= 0) {
    return null;
  }

  return (
    <View style={styles.returnsSection}>
      <Text style={styles.returnsTitle}>Returns Deduction</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Returns Deduction</Text>
        <Text style={styles.summaryValue}>
          ({formatCurrency(calculations.returnsDeduction)})
        </Text>
      </View>
    </View>
  );
}

/**
 * Advance Recoupment Section
 * AC-5.2.5: Original advance, previously recouped, this period's recoupment, remaining balance
 */
function RecoupmentSection({ data }: { data: StatementPDFData }) {
  const { advanceRecoupment } = data.calculations;

  // Only show if there's an advance
  if (advanceRecoupment.originalAdvance <= 0) {
    return null;
  }

  return (
    <View style={styles.recoupmentSection}>
      <Text style={styles.sectionTitle}>Advance Recoupment</Text>
      <View style={styles.recoupmentRow}>
        <Text style={styles.recoupmentLabel}>Original Advance</Text>
        <Text style={styles.recoupmentValue}>
          {formatCurrency(advanceRecoupment.originalAdvance)}
        </Text>
      </View>
      <View style={styles.recoupmentRow}>
        <Text style={styles.recoupmentLabel}>Previously Recouped</Text>
        <Text style={styles.recoupmentValue}>
          {formatCurrency(advanceRecoupment.previouslyRecouped)}
        </Text>
      </View>
      <View style={styles.recoupmentRow}>
        <Text style={styles.recoupmentLabel}>This Period</Text>
        <Text style={styles.recoupmentValue}>
          ({formatCurrency(advanceRecoupment.thisPeriodsRecoupment)})
        </Text>
      </View>
      <View style={[styles.recoupmentRow, { marginTop: 4 }]}>
        <Text style={[styles.recoupmentLabel, { fontWeight: "bold" }]}>
          Remaining Balance
        </Text>
        <Text style={[styles.recoupmentValue, { fontWeight: "bold" }]}>
          {formatCurrency(advanceRecoupment.remainingAdvance)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Footer Component
 * AC-5.2.1: Generation timestamp and statement ID
 */
function Footer({ data }: { data: StatementPDFData }) {
  const generatedAt = new Date().toISOString();

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Generated: {formatDate(generatedAt)}
      </Text>
      <Text style={styles.footerText}>Statement ID: {data.statementId}</Text>
    </View>
  );
}

/**
 * Main Statement PDF Document
 *
 * Renders a complete royalty statement PDF with all sections.
 */
export function StatementPDF({ data }: { data: StatementPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <CoAuthorSection data={data} />
        <LifetimeSection data={data} />
        <AuthorInfo data={data} />
        <SummarySection data={data} />
        <SalesBreakdown data={data} />
        <ReturnsSection data={data} />
        <RecoupmentSection data={data} />
        <Footer data={data} />
      </Page>
    </Document>
  );
}

export default StatementPDF;
