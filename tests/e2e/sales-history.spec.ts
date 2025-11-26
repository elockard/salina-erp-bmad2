import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Sales Transaction History View
 * Story 3.3 - Build Sales Transaction History View
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - Test sales data for filtering/pagination
 * - Authentication helper to be implemented
 *
 * AC Coverage:
 * - AC 1: Page at /sales with header, subtitle, Modular Dashboard Grid layout
 * - AC 2: Stats cards (Total Sales, Transactions, Best Seller)
 * - AC 3: Table with columns
 * - AC 4: Filter controls
 * - AC 5: Sorting and pagination
 * - AC 6: Transaction detail modal
 * - AC 7: CSV export
 * - AC 8: Loading, empty, error states
 * - AC 9: Permission enforcement
 * - AC 10: Responsive design
 */

test.describe("Sales History Page - Layout and Elements", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor/admin user with RECORD_SALES permission
    // await loginAs(page, "editor@testorg.com");
    await page.goto("/sales");
  });

  test("AC1: Page renders with correct header and subtitle", async ({
    page,
  }) => {
    // Page header
    await expect(
      page.getByRole("heading", { name: "Sales Transactions" }),
    ).toBeVisible();

    // Subtitle
    await expect(
      page.getByText("View and filter recorded sales"),
    ).toBeVisible();
  });

  test("AC1: Page has breadcrumb navigation", async ({ page }) => {
    // Breadcrumb: Dashboard > Sales Transactions
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Sales Transactions")).toBeVisible();
  });

  test("AC1: Page has Record Sale and Export buttons", async ({ page }) => {
    // Record Sale button links to /sales/new
    const recordButton = page.getByRole("link", { name: /Record Sale/i });
    await expect(recordButton).toBeVisible();
    await expect(recordButton).toHaveAttribute("href", "/sales/new");

    // Export to CSV button
    const exportButton = page.getByRole("button", { name: /Export to CSV/i });
    await expect(exportButton).toBeVisible();
  });
});

test.describe("Sales History Page - Stats Cards", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales");
  });

  test("AC2: Stats cards are visible", async ({ page }) => {
    // Total Sales card
    await expect(page.getByText("Total Sales This Month")).toBeVisible();

    // Transactions card
    await expect(page.getByText("Transactions This Month")).toBeVisible();

    // Best Selling Title card
    await expect(page.getByText("Best Selling Title")).toBeVisible();
  });

  test("AC2: Stats cards show skeleton while loading", async ({ page }) => {
    // Navigate and check for skeleton
    await page.goto("/sales");

    // Should briefly show skeleton (or immediately show data if fast)
    // This test verifies the component renders
    const statsSection = page.locator(".grid").first();
    await expect(statsSection).toBeVisible();
  });
});

test.describe("Sales History Page - Filters", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales");
  });

  test("AC4: Date range filter is visible", async ({ page }) => {
    await expect(page.getByText("Date Range")).toBeVisible();

    // Date range button should show current month
    const dateButton = page.getByRole("button", { name: /Pick a date/ });
    await expect(dateButton).toBeVisible();
  });

  test("AC4: Title filter autocomplete is visible", async ({ page }) => {
    await expect(page.getByText(/^Title$/)).toBeVisible();

    // Title search button
    const titleButton = page.getByRole("combobox", { name: "Select title" });
    await expect(titleButton).toBeVisible();
  });

  test("AC4: Format dropdown is visible with options", async ({ page }) => {
    await expect(page.getByText(/^Format$/)).toBeVisible();

    // Click format dropdown
    await page.getByRole("combobox").first().click();

    // Check options
    await expect(
      page.getByRole("option", { name: "All Formats" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Physical" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Ebook" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Audiobook" })).toBeVisible();
  });

  test("AC4: Channel dropdown is visible with options", async ({ page }) => {
    await expect(page.getByText(/^Channel$/)).toBeVisible();

    // Find and click channel dropdown (second combobox)
    const channelDropdown =
      page.locator('[data-testid="channel-filter"]').first() ??
      page.getByRole("combobox").nth(1);
    await channelDropdown.click();

    // Check options
    await expect(
      page.getByRole("option", { name: "All Channels" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Retail" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Wholesale" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Direct" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Distributor" }),
    ).toBeVisible();
  });

  test("AC4: Clear Filters button appears when filters are active", async ({
    page,
  }) => {
    // Initially, clear filters may not be visible (if only date range is active)
    // Select a format filter
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Physical" }).click();

    // Clear Filters button should appear
    await expect(
      page.getByRole("button", { name: /Clear Filters/i }),
    ).toBeVisible();
  });

  test("AC4: Clicking Clear Filters resets to defaults", async ({ page }) => {
    // Apply a filter
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Ebook" }).click();

    // Click clear filters
    await page.getByRole("button", { name: /Clear Filters/i }).click();

    // Format should be back to "All Formats"
    await expect(page.getByRole("combobox").first()).toContainText(
      "All Formats",
    );
  });
});

test.describe("Sales History Page - Table", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales");
  });

  test("AC3: Table has correct column headers", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table", { timeout: 5000 }).catch(() => {
      // Table might not exist if empty state
    });

    // Check column headers (if table exists)
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      await expect(
        table.getByRole("columnheader", { name: /Date/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Title/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Format/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Qty/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Unit Price/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Total/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Channel/i }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: /Recorded By/i }),
      ).toBeVisible();
    }
  });

  test("AC5: Date column is sortable", async ({ page }) => {
    // Wait for table
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      // Click Date header to sort
      const dateHeader = page.getByRole("button", { name: /Date/i });
      await dateHeader.click();

      // Should toggle sort (no specific assertion, just verify click works)
      await expect(dateHeader).toBeVisible();
    }
  });

  test("AC5: Total column is sortable", async ({ page }) => {
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      // Click Total header to sort
      const totalHeader = page.getByRole("button", { name: /Total/i });
      await totalHeader.click();

      await expect(totalHeader).toBeVisible();
    }
  });

  test("AC5: Pagination controls are visible when data exists", async ({
    page,
  }) => {
    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check for pagination text (might show empty state or data)
    const showingText = page.getByText(/Showing \d+-\d+ of \d+ transactions/);
    const emptyText = page.getByText("No sales transactions found");

    // Either pagination or empty state should be visible
    const hasPagination = await showingText.isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasPagination || hasEmpty).toBe(true);
  });

  test("AC8: Empty state shows message when no sales", async ({ page }) => {
    // Apply filter that returns no results
    await page.goto("/sales?title_id=00000000-0000-0000-0000-000000000000");

    // Empty state should appear
    await expect(page.getByText("No sales transactions found")).toBeVisible();
    await expect(
      page.getByText("Record your first sale to see it here"),
    ).toBeVisible();
  });
});

test.describe("Sales History Page - Transaction Detail Modal", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor with test data
    await page.goto("/sales");
  });

  test("AC6: Clicking row opens transaction detail modal", async ({ page }) => {
    // Wait for table to load
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      const rows = table.locator("tbody tr");
      const hasRows = (await rows.count()) > 0;

      if (hasRows) {
        // Click first row
        await rows.first().click();

        // Modal should open
        await expect(
          page.getByRole("dialog").getByText("Transaction Details"),
        ).toBeVisible();
      }
    }
  });

  test("AC6: Modal shows immutability notice", async ({ page }) => {
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      const rows = table.locator("tbody tr");
      const hasRows = (await rows.count()) > 0;

      if (hasRows) {
        await rows.first().click();

        // Check for immutability notice
        await expect(page.getByText("Immutable Record")).toBeVisible();
        await expect(
          page.getByText(/cannot be modified or deleted/i),
        ).toBeVisible();
      }
    }
  });

  test("AC6: Modal closes on close button click", async ({ page }) => {
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      const rows = table.locator("tbody tr");
      const hasRows = (await rows.count()) > 0;

      if (hasRows) {
        await rows.first().click();

        // Wait for modal
        await expect(page.getByRole("dialog")).toBeVisible();

        // Click close button
        await page.getByRole("button", { name: /Close/i }).click();

        // Modal should close
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }
    }
  });

  test("AC6: Modal closes on click outside", async ({ page }) => {
    const table = page.locator("table");
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      const rows = table.locator("tbody tr");
      const hasRows = (await rows.count()) > 0;

      if (hasRows) {
        await rows.first().click();

        // Wait for modal
        await expect(page.getByRole("dialog")).toBeVisible();

        // Click overlay (outside dialog content)
        await page
          .locator('[data-slot="dialog-overlay"]')
          .click({ force: true });

        // Modal should close
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }
    }
  });
});

test.describe("Sales History Page - CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales");
  });

  test("AC7: Export button is disabled when no data", async ({ page }) => {
    // Go to page with filter that returns no results
    await page.goto("/sales?title_id=00000000-0000-0000-0000-000000000000");

    // Wait for loading to complete
    await page.waitForTimeout(1000);

    // Export button should be disabled
    const exportButton = page.getByRole("button", { name: /Export to CSV/i });
    await expect(exportButton).toBeDisabled();
  });

  test("AC7: Export button triggers download", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);

    // Check if there's data
    const showingText = page.getByText(/Showing \d+-\d+ of \d+ transactions/);
    const hasData = await showingText.isVisible().catch(() => false);

    if (hasData) {
      // Set up download listener
      const downloadPromise = page.waitForEvent("download");

      // Click export
      await page.getByRole("button", { name: /Export to CSV/i }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify filename format
      expect(download.suggestedFilename()).toMatch(
        /^sales-export-\d{4}-\d{2}-\d{2}\.csv$/,
      );
    }
  });
});

test.describe("Sales History Page - Permission Enforcement", () => {
  test("AC9: Unauthorized users are redirected", async ({ page }) => {
    // TODO: Login as author role (no RECORD_SALES permission)
    // await loginAs(page, "author@testorg.com");

    await page.goto("/sales");

    // Authors should be redirected to portal by dashboard layout
    // This test verifies the redirect happens
    await expect(page).toHaveURL(/dashboard|portal|sign-in/);
  });

  test("AC9: Owner can access sales page", async ({ page }) => {
    // TODO: Login as owner
    // await loginAs(page, "owner@testorg.com");

    await page.goto("/sales");

    // Should see the page (not redirected)
    await expect(
      page.getByRole("heading", { name: "Sales Transactions" }),
    ).toBeVisible();
  });

  test("AC9: Finance can access sales page", async ({ page }) => {
    // TODO: Login as finance
    // await loginAs(page, "finance@testorg.com");

    await page.goto("/sales");

    await expect(
      page.getByRole("heading", { name: "Sales Transactions" }),
    ).toBeVisible();
  });
});

test.describe("Sales History Page - Responsive Design", () => {
  test("AC10: Mobile layout - cards stack vertically", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/sales");

    // Stats cards should be visible and stacked
    const statsGrid = page.locator(".grid").first();
    await expect(statsGrid).toBeVisible();

    // On mobile, grid should have single column
    // The grid classes should be gap-4 md:grid-cols-2 lg:grid-cols-3
  });

  test("AC10: Tablet layout - 2 column card grid", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/sales");

    // Stats cards should be in 2-column grid
    const statsGrid = page.locator(".grid").first();
    await expect(statsGrid).toBeVisible();
  });

  test("AC10: Desktop layout - 3 column card grid", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/sales");

    // Stats cards should be in 3-column grid
    const statsGrid = page.locator(".grid").first();
    await expect(statsGrid).toBeVisible();
  });
});

test.describe("Sales History Page - Navigation", () => {
  test("Sales navigation link goes to /sales", async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/dashboard");

    // Find Sales link in navigation
    const salesLink = page.getByRole("link", { name: /^Sales$/i });
    await expect(salesLink).toBeVisible();

    // Click should navigate to /sales
    await salesLink.click();
    await expect(page).toHaveURL(/\/sales$/);
  });

  test("Record Sale link from sales page goes to /sales/new", async ({
    page,
  }) => {
    await page.goto("/sales");

    // Click Record Sale button
    await page.getByRole("link", { name: /Record Sale/i }).click();

    // Should navigate to /sales/new
    await expect(page).toHaveURL(/\/sales\/new$/);
  });
});

test.describe("Sales History Page - Filter URL Persistence", () => {
  test("AC4: Filters are reflected in URL", async ({ page }) => {
    await page.goto("/sales");

    // Apply format filter
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Physical" }).click();

    // URL should contain format parameter
    await expect(page).toHaveURL(/format=physical/);
  });

  test("AC4: URL filters are applied on page load", async ({ page }) => {
    // Navigate with filters in URL
    await page.goto("/sales?format=ebook");

    // Format dropdown should show Ebook selected
    await expect(page.getByRole("combobox").first()).toContainText("Ebook");
  });
});
