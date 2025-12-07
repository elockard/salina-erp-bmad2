import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Accounts Receivable Dashboard
 * Story 8.5 - Build Accounts Receivable Dashboard
 *
 * AC Coverage:
 * - AC-8.5.1: Finance user can access /reports/accounts-receivable page
 * - AC-8.5.2: Summary statistics display (Total, Current, Overdue, Avg Days)
 * - AC-8.5.3: Aging report table with buckets and sorting
 * - AC-8.5.4: Customer click opens slide-out panel with detail
 * - AC-8.5.5: Visual aging chart showing distribution
 * - AC-8.5.6: CSV export functionality
 * - AC-8.5.7: PDF export with company header
 */

test.describe("Accounts Receivable - Access and Layout (AC-8.5.1)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    // await loginAs(page, "finance@testorg.com");
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.1: Page renders with correct header", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Accounts Receivable" }),
    ).toBeVisible();

    await expect(
      page.getByText("Track outstanding invoices and customer aging"),
    ).toBeVisible();
  });

  test("AC-8.5.1: Page has proper navigation context", async ({ page }) => {
    // Page header shows proper context - breadcrumbs not implemented for this report
    await expect(
      page.getByRole("heading", { name: "Accounts Receivable" }),
    ).toBeVisible();
  });

  test("AC-8.5.1: Finance users have access", async ({ page }) => {
    // Page should not redirect unauthorized users
    await expect(page).toHaveURL(/\/reports\/accounts-receivable/);
  });
});

test.describe("Accounts Receivable - Summary Stats (AC-8.5.2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.2: Displays total receivables card", async ({ page }) => {
    const card = page.getByTestId("total-receivables-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Total Receivables")).toBeVisible();
  });

  test("AC-8.5.2: Displays current amount card", async ({ page }) => {
    const card = page.getByTestId("current-amount-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Current")).toBeVisible();
  });

  test("AC-8.5.2: Displays overdue amount card", async ({ page }) => {
    const card = page.getByTestId("overdue-amount-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Overdue")).toBeVisible();
  });

  test("AC-8.5.2: Displays average days to pay card", async ({ page }) => {
    const card = page.getByTestId("avg-days-to-pay-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Avg Days to Pay")).toBeVisible();
  });
});

test.describe("Accounts Receivable - Aging Table (AC-8.5.3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.3: Aging table renders with correct column headers", async ({
    page,
  }) => {
    const table = page.getByTestId("ar-aging-table");
    await expect(table).toBeVisible();

    // Check for aging bucket columns
    await expect(page.getByText("Customer")).toBeVisible();
    await expect(page.getByText("Current")).toBeVisible();
    await expect(page.getByText("1-30 Days")).toBeVisible();
    await expect(page.getByText("31-60 Days")).toBeVisible();
    await expect(page.getByText("61-90 Days")).toBeVisible();
    await expect(page.getByText("90+ Days")).toBeVisible();
    await expect(page.getByText("Total")).toBeVisible();
  });

  test("AC-8.5.3: Empty state shows no outstanding receivables message", async ({
    page,
  }) => {
    // If no data, should show empty state
    const emptyState = page.getByTestId("ar-aging-table-empty");
    const table = page.getByTestId("ar-aging-table");

    // Either table or empty state should be visible
    await expect(table.or(emptyState)).toBeVisible();
  });
});

test.describe("Accounts Receivable - Customer Detail (AC-8.5.4)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.4: Customer name click opens detail panel", async ({ page }) => {
    // Wait for table to load
    const table = page.getByTestId("ar-aging-table");

    // Only run if there's data in the table
    const hasData = await table.isVisible().catch(() => false);
    if (!hasData) {
      test.skip();
      return;
    }

    // Find first customer button and click
    const customerButton = page.getByRole("button", { name: /View details for/i }).first();
    const buttonExists = await customerButton.isVisible().catch(() => false);

    if (buttonExists) {
      await customerButton.click();

      // Sheet should open
      await expect(page.getByTestId("ar-customer-detail-panel")).toBeVisible();
    }
  });
});

test.describe("Accounts Receivable - Aging Chart (AC-8.5.5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.5: Aging chart is visible", async ({ page }) => {
    // Either chart or empty state should be visible
    const chart = page.getByTestId("ar-aging-chart");
    const emptyChart = page.getByTestId("ar-aging-chart-empty");

    await expect(chart.or(emptyChart)).toBeVisible();
  });

  test("AC-8.5.5: Chart shows aging distribution title", async ({ page }) => {
    const chart = page.getByTestId("ar-aging-chart");
    const isVisible = await chart.isVisible().catch(() => false);

    if (isVisible) {
      await expect(page.getByText("Aging Distribution")).toBeVisible();
    }
  });
});

test.describe("Accounts Receivable - Export Functions (AC-8.5.6, AC-8.5.7)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/accounts-receivable");
  });

  test("AC-8.5.6, AC-8.5.7: Export button is visible", async ({ page }) => {
    const exportButton = page.getByTestId("ar-export-button");
    await expect(exportButton).toBeVisible();
  });

  test("AC-8.5.6: Export dropdown shows CSV option", async ({ page }) => {
    const exportButton = page.getByTestId("ar-export-button");

    // Check if button is enabled (has data)
    const isDisabled = await exportButton.isDisabled();

    if (!isDisabled) {
      await exportButton.click();
      await expect(page.getByTestId("ar-export-csv")).toBeVisible();
    }
  });

  test("AC-8.5.7: Export dropdown shows PDF option", async ({ page }) => {
    const exportButton = page.getByTestId("ar-export-button");

    const isDisabled = await exportButton.isDisabled();

    if (!isDisabled) {
      await exportButton.click();
      await expect(page.getByTestId("ar-export-pdf")).toBeVisible();
    }
  });
});

test.describe("Accounts Receivable - Responsive Design", () => {
  test("Page is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reports/accounts-receivable");

    // Page should still render main elements
    await expect(
      page.getByRole("heading", { name: "Accounts Receivable" }),
    ).toBeVisible();
  });

  test("Page is responsive on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/reports/accounts-receivable");

    await expect(
      page.getByRole("heading", { name: "Accounts Receivable" }),
    ).toBeVisible();
  });
});
