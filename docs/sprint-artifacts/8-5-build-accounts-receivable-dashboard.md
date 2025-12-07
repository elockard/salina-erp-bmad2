# Story 8.5: Build Accounts Receivable Dashboard

Status: done

## Quick Reference

| Pattern | Source File |
|---------|-------------|
| Report page pattern | `src/app/(dashboard)/reports/royalty-liability/page.tsx` |
| Summary stats cards | `src/modules/reports/components/liability-summary-stats.tsx` |
| Data table pattern | `src/modules/reports/components/liability-by-author-table.tsx` |
| Export button | `src/modules/reports/components/export-button.tsx` |
| Invoice queries | `src/modules/invoices/queries.ts` |
| Invoice types | `src/modules/invoices/types.ts` |
| Chart wrapper | `src/components/charts/dashboard-chart-wrapper.tsx` |
| PDF generator | `src/modules/statements/pdf-generator.ts` |
| Permission check | `src/lib/auth.ts` → `hasPermission()` |

## Story

**FRs Covered:** FR102 (Track AR balance per customer), FR104 (AR aging reports)

As a **finance user**,
I want **to see AR summary and aging report**,
So that **I can manage cash flow and collections**.

## Acceptance Criteria

### AC-8.5.1: AR Dashboard Access
**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /reports/accounts-receivable
**Then** I see the AR dashboard with summary stats, aging report, and charts
**And** Editor and Author roles are redirected to /dashboard

### AC-8.5.2: Summary Stats Cards
**Given** I am on the AR dashboard
**When** the page loads
**Then** I see summary stats cards displaying:
- **Total Receivables**: Sum of all balance_due across all non-void invoices
- **Current (not yet due)**: Sum of balance_due where due_date >= today
- **Overdue**: Sum of balance_due where due_date < today and status != 'paid'
- **Average Days to Pay**: Calculated from paid invoices (invoice_date to payment_date)
- **Number of Open Invoices**: Count of invoices with balance_due > 0

### AC-8.5.3: Aging Report Table
**Given** I am on the AR dashboard
**When** I view the aging report
**Then** I see a table with columns:
- Customer (contact name)
- Current (0 days past due)
- 1-30 Days
- 31-60 Days
- 61-90 Days
- 90+ Days
- Total
**And** rows are sorted by Total (highest first by default)
**And** each row shows customer's receivables in appropriate aging buckets
**And** a totals row at the bottom sums each column

### AC-8.5.4: Customer Drill-Down
**Given** I click on a customer row in the aging table
**When** the drill-down opens
**Then** I see all invoices for that customer:
- Invoice number (link to invoice detail)
- Invoice date
- Due date
- Amount
- Balance due
- Days overdue (or "Current" if not overdue)
- Status badge
**And** payment history summary
**And** customer's average days to pay

### AC-8.5.5: Aging Chart Visualization
**Given** I am on the AR dashboard
**When** I view the aging chart
**Then** I see a stacked bar chart showing:
- X-axis: Aging buckets (Current, 1-30, 31-60, 61-90, 90+)
- Y-axis: Dollar amounts
- Color-coded bars per bucket
**And** the chart provides visual representation of AR health

### AC-8.5.6: CSV Export
**Given** I am on the AR dashboard
**When** I click the "Export CSV" button
**Then** a CSV file downloads containing:
- All aging report data (customer, buckets, totals)
- Export timestamp
- Column headers matching table display
**And** filename format: `ar-aging-report-YYYY-MM-DD.csv`

### AC-8.5.7: PDF Summary Export
**Given** I am on the AR dashboard
**When** I click the "Export PDF" button
**Then** a PDF generates containing:
- Report header with company name and date
- Summary statistics section
- Aging report table
- Total receivables breakdown
**And** filename format: `ar-summary-YYYY-MM-DD.pdf`

### AC-8.5.8: Real-Time Data
**Given** invoice or payment changes occur
**When** I refresh the AR dashboard
**Then** all statistics and aging buckets reflect current data

### AC-8.5.9: Navigation Integration
**Given** I am on the dashboard or reports page
**When** I look at the navigation
**Then** I see "Accounts Receivable" link under Reports section
**And** the link navigates to /reports/accounts-receivable

## Tasks / Subtasks

- [x] **Task 1: Create AR Query Functions** (AC: 8.5.2, 8.5.3) ✅
  - [x] Add `getARSummary()` to `src/modules/reports/queries.ts`
  - [x] Add `getAgingReportByCustomer()` to return aging buckets per customer
  - [x] Add `getCustomerARDetail()` for drill-down data
  - [x] Calculate aging buckets based on due_date vs today
  - [x] Use Decimal.js for financial precision

- [x] **Task 2: Create AR Types** (AC: ALL) ✅
  - [x] Add `ARSummary` interface to `src/modules/reports/types.ts`
  - [x] Add `AgingReportRow` interface (customer + buckets + total)
  - [x] Add `CustomerARDetail` interface for drill-down
  - [x] Add `AgingBucket` type union: 'current' | '1-30' | '31-60' | '61-90' | '90+'

- [x] **Task 3: Create AR Summary Stats Component** (AC: 8.5.2) ✅
  - [x] Create `src/modules/reports/components/ar-summary-stats.tsx`
  - [x] Display 5 stats cards: Total Receivables, Current, Overdue, Avg Days to Pay, Open Invoices
  - [x] Use lucide-react icons (DollarSign, Clock, AlertTriangle, Calendar, FileText)
  - [x] Format currency with Intl.NumberFormat
  - [x] Add data-testid attributes for testing

- [x] **Task 4: Create Aging Report Table Component** (AC: 8.5.3, 8.5.4) ✅
  - [x] Create `src/modules/reports/components/ar-aging-table.tsx`
  - [x] Table columns: Customer, Current, 1-30, 31-60, 61-90, 90+, Total
  - [x] Sortable by Total (default), customer name
  - [x] Expandable rows for customer drill-down
  - [x] Click row to open customer detail modal/panel
  - [x] Totals row at bottom
  - [x] Currency formatting for all amount columns

- [x] **Task 5: Create Aging Chart Component** (AC: 8.5.5) ✅
  - [x] Create `src/modules/reports/components/ar-aging-chart.tsx`
  - [x] Use Recharts BarChart component
  - [x] Stacked bar chart with aging buckets
  - [x] Color scheme: Current (green), 1-30 (yellow), 31-60 (orange), 61-90 (red), 90+ (dark red)
  - [x] Responsive sizing
  - [x] Tooltip on hover showing amounts

- [x] **Task 6: Create Customer AR Detail Panel** (AC: 8.5.4) ✅
  - [x] Create `src/modules/reports/components/ar-customer-detail.tsx`
  - [x] Sheet/Modal showing customer invoices
  - [x] Invoice list with links to detail pages
  - [x] Payment history summary
  - [x] Customer statistics (avg days to pay, total billed, total paid)

- [x] **Task 7: Create AR Export Buttons** (AC: 8.5.6, 8.5.7) ✅
  - [x] Create `src/modules/reports/components/ar-export-buttons.tsx`
  - [x] CSV export action (client-side generation)
  - [x] PDF export action (print dialog with formatted HTML)
  - [x] Loading states during export

- [x] **Task 8: Create AR Report Page** (AC: 8.5.1, 8.5.8, 8.5.9) ✅
  - [x] Create `src/app/(dashboard)/reports/accounts-receivable/page.tsx`
  - [x] Permission check: Finance, Admin, Owner only
  - [x] Suspense boundaries with loading skeletons
  - [x] Compose: ARSummaryStats, ARAgingTable, ARAgingChart, ARExportButtons
  - [x] Add page to reports navigation

- [x] **Task 9: Update Navigation** (AC: 8.5.9) ✅
  - [x] Add "Accounts Receivable" to reports section in navigation
  - [x] Add AR report card to `/reports` page grid in `src/app/(dashboard)/reports/page.tsx`
  - [x] Add route to reports listing page

- [x] **Task 10: Export Components** (AC: ALL) ✅
  - [x] Update `src/modules/reports/components/index.ts`
  - [x] Export all new AR components

- [x] **Task 11: Unit Tests** (AC: 8.5.2, 8.5.3, 8.5.5) ✅
  - [x] Create `tests/unit/ar-dashboard.test.ts` (27 tests passing)
  - [x] Test aging bucket calculations
  - [x] Test stats calculations
  - [x] Test currency formatting
  - [x] Test sorting

- [x] **Task 12: Integration Tests** (AC: 8.5.1, 8.5.2, 8.5.3) ✅
  - [x] Create `tests/integration/ar-dashboard.test.tsx` (27 tests passing)
  - [x] Test component rendering
  - [x] Test data loading with test fixtures
  - [x] Test export functionality

- [x] **Task 13: E2E Tests** (AC: ALL) ✅
  - [x] Create `tests/e2e/accounts-receivable.spec.ts`
  - [x] Test page loads for authorized users
  - [x] Test redirect for unauthorized users
  - [x] Test stats cards display
  - [x] Test aging table functionality
  - [x] Test customer drill-down
  - [x] Test CSV export downloads file
  - [x] Test navigation links

## Dev Notes

### Architecture Patterns

**AR Summary Query:**
```typescript
// In queries.ts
import { and, eq, gt, inArray, desc } from "drizzle-orm";
import Decimal from "decimal.js";
import { invoices } from "@/db/schema/invoices";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import type { ARSummary } from "./types";

// Valid statuses for AR calculations (not draft/void, but includes overdue)
const AR_VALID_STATUSES = ["sent", "partially_paid", "overdue"];

export async function getARSummary(): Promise<ARSummary> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();
  const today = new Date();

  // Get all invoices with balance > 0 (includes sent, partially_paid, overdue)
  const openInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.tenant_id, tenantId),
      gt(invoices.balance_due, "0"),
      inArray(invoices.status, AR_VALID_STATUSES)
    ),
  });

  let totalReceivables = new Decimal(0);
  let currentAmount = new Decimal(0);
  let overdueAmount = new Decimal(0);

  for (const invoice of openInvoices) {
    const balance = new Decimal(invoice.balance_due);
    totalReceivables = totalReceivables.plus(balance);

    if (invoice.due_date && new Date(invoice.due_date) < today) {
      overdueAmount = overdueAmount.plus(balance);
    } else {
      currentAmount = currentAmount.plus(balance);
    }
  }

  // Calculate average days to pay from paid invoices
  const paidInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.tenant_id, tenantId),
      eq(invoices.status, "paid")
    ),
    with: {
      payments: true,
    },
  });

  let totalDays = 0;
  let paidCount = 0;

  for (const invoice of paidInvoices) {
    if (invoice.payments.length > 0 && invoice.invoice_date) {
      // Find the final payment date
      const lastPayment = invoice.payments.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )[0];

      const invoiceDate = new Date(invoice.invoice_date);
      const paymentDate = new Date(lastPayment.payment_date);
      const daysDiff = Math.ceil(
        (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      totalDays += daysDiff;
      paidCount++;
    }
  }

  const averageDaysToPay = paidCount > 0 ? Math.round(totalDays / paidCount) : 0;

  return {
    totalReceivables: totalReceivables.toFixed(2),
    currentAmount: currentAmount.toFixed(2),
    overdueAmount: overdueAmount.toFixed(2),
    averageDaysToPay,
    openInvoiceCount: openInvoices.length,
  };
}
```

**Aging Report Query:**
```typescript
// In queries.ts (uses imports from above)
import type { AgingReportRow } from "./types";
import { getInvoicesWithCustomer } from "@/modules/invoices/queries";

export async function getAgingReportByCustomer(): Promise<AgingReportRow[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();
  const today = new Date();

  // Get all open invoices with customer info
  const invoicesWithCustomers = await getInvoicesWithCustomer({});

  // Filter to open invoices (sent, partially_paid, overdue with balance > 0)
  const openInvoices = invoicesWithCustomers.filter(
    inv => AR_VALID_STATUSES.includes(inv.status) && parseFloat(inv.balance_due) > 0
  );

  // Group by customer
  const customerMap = new Map<string, AgingReportRow>();

  for (const invoice of openInvoices) {
    const customerId = invoice.customer_id;
    const customerName = `${invoice.customer.first_name} ${invoice.customer.last_name}`;

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        customerName,
        current: new Decimal(0),
        days1to30: new Decimal(0),
        days31to60: new Decimal(0),
        days61to90: new Decimal(0),
        days90plus: new Decimal(0),
        total: new Decimal(0),
      });
    }

    const row = customerMap.get(customerId)!;
    const balance = new Decimal(invoice.balance_due);
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : today;
    const daysOverdue = Math.ceil(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Assign to appropriate bucket
    if (daysOverdue <= 0) {
      row.current = row.current.plus(balance);
    } else if (daysOverdue <= 30) {
      row.days1to30 = row.days1to30.plus(balance);
    } else if (daysOverdue <= 60) {
      row.days31to60 = row.days31to60.plus(balance);
    } else if (daysOverdue <= 90) {
      row.days61to90 = row.days61to90.plus(balance);
    } else {
      row.days90plus = row.days90plus.plus(balance);
    }

    row.total = row.total.plus(balance);
  }

  // Convert to array and sort by total descending
  return Array.from(customerMap.values())
    .map(row => ({
      ...row,
      current: row.current.toFixed(2),
      days1to30: row.days1to30.toFixed(2),
      days31to60: row.days31to60.toFixed(2),
      days61to90: row.days61to90.toFixed(2),
      days90plus: row.days90plus.toFixed(2),
      total: row.total.toFixed(2),
    }))
    .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
}
```

**AR Types:**
```typescript
// In types.ts
export interface ARSummary {
  totalReceivables: string;
  currentAmount: string;
  overdueAmount: string;
  averageDaysToPay: number;
  openInvoiceCount: number;
}

export interface AgingReportRow {
  customerId: string;
  customerName: string;
  current: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  days90plus: string;
  total: string;
}

export interface CustomerARDetail {
  customerId: string;
  customerName: string;
  invoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    total: string;
    balanceDue: string;
    status: string;
    daysOverdue: number;
  }[];
  paymentHistory: {
    totalBilled: string;
    totalPaid: string;
    avgDaysToPay: number;
  };
}
```

**Customer AR Detail Query (for drill-down):**
```typescript
// In queries.ts
import { contacts } from "@/db/schema/contacts";
import { tenants } from "@/db/schema/tenants";
import type { CustomerARDetail } from "./types";

export async function getCustomerARDetail(customerId: string): Promise<CustomerARDetail | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();
  const today = new Date();

  // Get customer info
  const customer = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, customerId), eq(contacts.tenant_id, tenantId)),
  });

  if (!customer) return null;

  // Get all invoices for this customer
  const customerInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.tenant_id, tenantId),
      eq(invoices.customer_id, customerId)
    ),
    with: { payments: true },
    orderBy: [desc(invoices.invoice_date)],
  });

  // Calculate invoice details with days overdue
  const invoiceDetails = customerInvoices
    .filter(inv => AR_VALID_STATUSES.includes(inv.status) && parseFloat(inv.balance_due) > 0)
    .map(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : today;
      const daysOverdue = Math.max(0, Math.ceil(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: new Date(inv.invoice_date),
        dueDate,
        total: inv.total,
        balanceDue: inv.balance_due,
        status: inv.status,
        daysOverdue,
      };
    });

  // Calculate payment history stats
  const totalBilled = customerInvoices.reduce(
    (sum, inv) => sum.plus(new Decimal(inv.total)), new Decimal(0)
  );
  const totalPaid = customerInvoices.reduce(
    (sum, inv) => sum.plus(new Decimal(inv.amount_paid)), new Decimal(0)
  );

  // Calculate average days to pay from paid invoices
  const paidInvoices = customerInvoices.filter(inv => inv.status === "paid" && inv.payments.length > 0);
  let avgDaysToPay = 0;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const lastPayment = inv.payments.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )[0];
      const days = Math.ceil(
        (new Date(lastPayment.payment_date).getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    avgDaysToPay = Math.round(totalDays / paidInvoices.length);
  }

  return {
    customerId,
    customerName: `${customer.first_name} ${customer.last_name}`,
    invoices: invoiceDetails,
    paymentHistory: {
      totalBilled: totalBilled.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      avgDaysToPay,
    },
  };
}

// Get tenant info for PDF report header
// NOTE: tenants schema uses 'name' field only (no company_name)
export async function getTenantForReport(): Promise<TenantForReport> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { name: true },
  });

  return {
    name: tenant?.name || "Unknown",
  };
}
```

**AR Page Structure:**
```typescript
// src/app/(dashboard)/reports/accounts-receivable/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import {
  ARSummaryStats,
  ARAgingTable,
  ARAgingChart,
  ARExportButton,
} from "@/modules/reports/components";
import { getARSummary, getAgingReportByCustomer } from "@/modules/reports/queries";

export const dynamic = "force-dynamic";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return <Skeleton className="h-96" />;
}

function ChartSkeleton() {
  return <Skeleton className="h-64" />;
}

async function ARDashboardContent() {
  const [summary, agingData] = await Promise.all([
    getARSummary(),
    getAgingReportByCustomer(),
  ]);

  return (
    <div className="space-y-6">
      <ARSummaryStats summary={summary} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ARAgingTable data={agingData} />
        </div>
        <div>
          <ARAgingChart data={agingData} />
        </div>
      </div>
    </div>
  );
}

export default async function AccountsReceivablePage() {
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Accounts Receivable
          </h1>
          <p className="text-muted-foreground">
            Track outstanding invoices and manage collections
          </p>
        </div>
        <ARExportButton />
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <StatsSkeleton />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TableSkeleton />
              </div>
              <div>
                <ChartSkeleton />
              </div>
            </div>
          </div>
        }
      >
        <ARDashboardContent />
      </Suspense>
    </div>
  );
}
```

### Existing Code to Reuse

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Stats cards layout | `src/modules/reports/components/liability-summary-stats.tsx` | Card grid, icons, formatting |
| Data table | `src/modules/reports/components/liability-by-author-table.tsx` | Table structure, sorting |
| Export button | `src/modules/reports/components/export-button.tsx` | CSV export pattern |
| Chart wrapper | `src/components/charts/dashboard-chart-wrapper.tsx` | Recharts wrapper with title/description |
| PDF generator | `src/modules/statements/pdf-generator.ts` | React-PDF patterns, styles |
| Permission check | `src/lib/auth.ts` | `hasPermission()` |
| Invoice queries | `src/modules/invoices/queries.ts` | Query patterns, customer joins |
| Tenant queries | `src/modules/tenant/queries.ts` | getTenant for company name |
| Currency formatting | Multiple files | `Intl.NumberFormat` pattern |
| Empty state pattern | `src/modules/isbn/components/isbn-pool-table.tsx` | Empty state UI with CTA |

### Database Operations

**Required Queries:**
- Open invoices (status not void/draft, balance_due > 0)
- Paid invoices with payment dates (for avg days to pay)
- Invoices grouped by customer for aging buckets

**Aging Bucket Calculation:**
```
Current: due_date >= today (not yet due)
1-30 Days: 1 <= daysOverdue <= 30
31-60 Days: 31 <= daysOverdue <= 60
61-90 Days: 61 <= daysOverdue <= 90
90+ Days: daysOverdue > 90

daysOverdue = Math.ceil((today - due_date) / (1000 * 60 * 60 * 24))
```

### Testing Standards

**Unit Tests:** `tests/unit/ar-summary-stats.test.tsx`
- Test renders all 5 stats cards
- Test currency formatting
- Test zero state handling
- Test large numbers formatting

**Unit Tests:** `tests/unit/ar-aging-table.test.tsx`
- Test table renders all columns
- Test sorting by total (default)
- Test sorting by customer name
- Test totals row calculation
- Test empty state

**Unit Tests:** `tests/unit/ar-aging-queries.test.ts`
- Test aging bucket assignment
- Test current vs overdue classification
- Test average days to pay calculation
- Test Decimal precision

**Integration Tests:** `tests/integration/accounts-receivable.test.tsx`
```typescript
describe("Accounts Receivable Dashboard", () => {
  it("should display AR summary stats", async () => {
    // Create test invoices with various states
    // Render page
    // Verify stats cards show correct values
  });

  it("should calculate aging buckets correctly", async () => {
    // Create invoices with specific due dates
    // Verify correct bucket assignment
  });

  it("should enforce permission", async () => {
    // Mock user with editor role
    // Verify redirect to dashboard
  });

  it("should export CSV with correct data", async () => {
    // Click export button
    // Verify CSV content matches table data
  });
});
```

**E2E Tests:** `tests/e2e/accounts-receivable.spec.ts`
```typescript
test.describe("Accounts Receivable", () => {
  test("should load dashboard for finance user", async ({ page }) => {
    // Login as finance user
    // Navigate to /reports/accounts-receivable
    // Verify page title and stats cards
  });

  test("should redirect unauthorized users", async ({ page }) => {
    // Login as editor
    // Navigate to AR page
    // Verify redirect to dashboard
  });

  test("should show aging report table", async ({ page }) => {
    // Navigate to AR page
    // Verify table headers
    // Verify customer rows
    // Verify totals row
  });

  test("should drill down to customer detail", async ({ page }) => {
    // Click on customer row
    // Verify detail panel opens
    // Verify invoice list displayed
  });

  test("should export CSV", async ({ page }) => {
    // Click export CSV button
    // Verify file download
  });
});
```

### Chart Configuration

**Aging Chart with DashboardChartWrapper:**
```typescript
// Use existing dashboard chart wrapper for consistent styling
import { DashboardChartWrapper } from "@/components/charts/dashboard-chart-wrapper";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

const AGING_COLORS = {
  current: "#22c55e",    // green-500
  "1-30": "#eab308",     // yellow-500
  "31-60": "#f97316",    // orange-500
  "61-90": "#ef4444",    // red-500
  "90+": "#991b1b",      // red-800
};

// Transform data for chart
const chartData = [
  { bucket: "Current", amount: parseFloat(totals.current), color: AGING_COLORS.current },
  { bucket: "1-30 Days", amount: parseFloat(totals.days1to30), color: AGING_COLORS["1-30"] },
  { bucket: "31-60 Days", amount: parseFloat(totals.days31to60), color: AGING_COLORS["31-60"] },
  { bucket: "61-90 Days", amount: parseFloat(totals.days61to90), color: AGING_COLORS["61-90"] },
  { bucket: "90+ Days", amount: parseFloat(totals.days90plus), color: AGING_COLORS["90+"] },
];

// In component:
<DashboardChartWrapper title="AR Aging Distribution" description="Receivables by age bucket">
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={chartData}>
      <XAxis dataKey="bucket" />
      <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} />
      <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Amount"]} />
      <Bar dataKey="amount">
        {chartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</DashboardChartWrapper>
```

### Navigation Update

**Add to dashboard-nav.ts:**
```typescript
// Under reports section
{
  title: "Accounts Receivable",
  href: "/reports/accounts-receivable",
  icon: Receipt,
  permission: ["owner", "admin", "finance"],
}
```

### Security Considerations

**Authorization:**
- Page-level permission check (Finance, Admin, Owner)
- All queries scoped to tenant
- No cross-tenant data leakage

**Data Integrity:**
- Read-only dashboard (no mutations)
- Real-time data from database
- Decimal.js for financial precision

### Empty State Handling

When no invoices exist or no open AR:
```typescript
// In ARSummaryStats component
if (summary.openInvoiceCount === 0) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Outstanding Receivables</h3>
        <p className="text-muted-foreground text-center max-w-md mt-2">
          All invoices have been paid. Create a new invoice to start tracking accounts receivable.
        </p>
        <Button asChild className="mt-4">
          <Link href="/invoices/new">Create Invoice</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// In ARAgingTable component
if (data.length === 0) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Report</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          No customers with outstanding balances.
        </p>
      </CardContent>
    </Card>
  );
}
```

### PDF Export Pattern

Reference existing React-PDF patterns from statements module:
```typescript
// Follow patterns from src/modules/statements/pdf-generator.ts
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { getTenantForReport } from "@/modules/reports/queries";

// PDF styles (reuse statement patterns)
const styles = StyleSheet.create({
  page: { padding: 40 },
  header: { marginBottom: 20 },
  companyName: { fontSize: 18, fontWeight: "bold" },
  reportTitle: { fontSize: 14, color: "#666" },
  table: { marginTop: 20 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eee" },
  tableHeader: { backgroundColor: "#f3f4f6", fontWeight: "bold" },
  tableCell: { padding: 8, flex: 1 },
});

// AR Report PDF Document
export function ARReportPDF({ summary, agingData, tenant }: ARReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>
            {tenant.name}
          </Text>
          <Text style={styles.reportTitle}>
            Accounts Receivable Aging Report
          </Text>
          <Text>Generated: {format(new Date(), "MMMM d, yyyy")}</Text>
        </View>
        {/* Summary stats and aging table */}
      </Page>
    </Document>
  );
}

// Server action for PDF export
export async function exportARReportPDF(): Promise<{ url: string }> {
  const [summary, agingData, tenant] = await Promise.all([
    getARSummary(),
    getAgingReportByCustomer(),
    getTenantForReport(),
  ]);

  // Generate PDF buffer using @react-pdf/renderer
  // Upload to S3 and return presigned URL
  // Follow patterns from statements module
}
```

### Project Structure Notes

**Files to Create:**
- `src/app/(dashboard)/reports/accounts-receivable/page.tsx`
- `src/modules/reports/components/ar-summary-stats.tsx`
- `src/modules/reports/components/ar-aging-table.tsx`
- `src/modules/reports/components/ar-aging-chart.tsx`
- `src/modules/reports/components/ar-export-button.tsx`
- `src/modules/reports/components/customer-ar-detail.tsx`
- `tests/unit/ar-summary-stats.test.tsx`
- `tests/unit/ar-aging-table.test.tsx`
- `tests/unit/ar-aging-queries.test.ts`
- `tests/integration/accounts-receivable.test.tsx`
- `tests/e2e/accounts-receivable.spec.ts`

**Files to Modify:**
- `src/modules/reports/queries.ts` - Add AR queries
- `src/modules/reports/types.ts` - Add AR types
- `src/modules/reports/actions.ts` - Add CSV/PDF export actions
- `src/modules/reports/components/index.ts` - Export new components
- `src/lib/dashboard-nav.ts` - Add AR navigation link

### Previous Story Intelligence

**From Story 8.4 (Payment Recording):**
- Payment data is available in payments table with invoice relation
- Invoice status workflow: draft → sent → partially_paid/paid
- Use `InvoiceWithDetails` type includes payment history
- `formatPaymentMethod()` helper exists for display

**Code Patterns Established:**
- Query pattern: tenant-scoped with `getCurrentTenantId()`
- Decimal.js for all financial calculations
- Permission check with `hasPermission()`
- Suspense boundaries with skeleton loading
- Data-testid attributes for testing

### References

- [Source: docs/epics.md#Epic-8, Story 8.5]
- [Source: docs/sprint-artifacts/8-4-implement-payment-recording.md] - Previous story patterns
- [Source: src/app/(dashboard)/reports/royalty-liability/page.tsx] - Report page pattern
- [Source: src/modules/reports/components/liability-summary-stats.tsx] - Stats cards pattern
- [Source: src/modules/invoices/queries.ts] - Invoice query patterns
- [Source: docs/architecture.md] - Project structure and technology stack

## Dev Agent Record

### Context Reference

Story context loaded from sprint-status.yaml, Epic 8 from epics.md, architecture patterns from existing reports module.

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Known Limitations

**PDF Export (AC-8.5.7):**
The current PDF export implementation uses a browser print dialog approach rather than generating an actual PDF file download. This was implemented due to the complexity of integrating @react-pdf/renderer in a client component.

**Workaround:** Users can save as PDF from the print dialog.

**Future Enhancement:** For a true PDF file download, implement a server action using @react-pdf/renderer similar to the statement PDF generation pattern in `src/modules/statements/pdf-generator.ts`. This would require:
1. Creating a server action that generates the PDF buffer
2. Uploading to S3 or returning as base64
3. Triggering download from the client

### File List

**Created:**
- `src/modules/reports/components/ar-summary-stats.tsx` - Summary stats cards component (AC-8.5.2)
- `src/modules/reports/components/ar-aging-table.tsx` - Aging report table with TanStack Table (AC-8.5.3)
- `src/modules/reports/components/ar-aging-chart.tsx` - Stacked bar chart visualization (AC-8.5.5)
- `src/modules/reports/components/ar-customer-detail.tsx` - Customer drill-down slide-out panel (AC-8.5.4)
- `src/modules/reports/components/ar-export-buttons.tsx` - CSV and PDF export dropdown (AC-8.5.6, AC-8.5.7)
- `src/modules/reports/components/ar-report-client.tsx` - Client wrapper for interactive features
- `src/app/(dashboard)/reports/accounts-receivable/page.tsx` - AR dashboard page (AC-8.5.1)
- `tests/unit/ar-dashboard.test.ts` - Unit tests (27 tests)
- `tests/integration/ar-dashboard.test.tsx` - Integration tests (27 tests)
- `tests/e2e/accounts-receivable.spec.ts` - E2E tests

**Modified:**
- `src/modules/reports/types.ts` - Added ARSummary, AgingReportRow, CustomerARDetail, TenantForReport types
- `src/modules/reports/queries.ts` - Added getARSummary, getAgingReportByCustomer, getCustomerARDetail, getTenantForReport
- `src/modules/reports/actions.ts` - Added fetchARSummary, fetchAgingReport, getCustomerARDetail, fetchTenantForReport
- `src/modules/reports/components/index.ts` - Exported new AR components
- `src/app/(dashboard)/reports/page.tsx` - Added Accounts Receivable card to reports grid (AC-8.5.9)
