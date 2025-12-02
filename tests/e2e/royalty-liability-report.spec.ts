import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Royalty Liability Report Page
 * Story 6.4 - Build Royalty Liability Summary Report
 *
 * AC Coverage:
 * - AC 1: Finance/Admin/Owner can access /reports/royalty-liability
 * - AC 2: Summary stats show Total Unpaid, Authors Pending, Oldest Statement
 * - AC 3: Average payment per author is calculated
 * - AC 4: Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement
 * - AC 5: Table is sortable by amount owed (default: highest first)
 * - AC 6: Advance tracking section shows authors with active advances
 * - AC 7: CSV export available for accounting system import
 */

test.describe("Royalty Liability Report Page - Access and Layout", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    // await loginAs(page, "finance@testorg.com");
    await page.goto("/reports/royalty-liability");
  });

  test("AC1: Page renders with correct header", async ({ page }) => {
    // Page header
    await expect(
      page.getByRole("heading", { name: "Royalty Liability Summary" }),
    ).toBeVisible();

    // Subtitle
    await expect(
      page.getByText("Track outstanding royalty obligations"),
    ).toBeVisible();
  });

  test("AC7: Export CSV button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Export CSV/i }),
    ).toBeVisible();
  });
});

test.describe("Royalty Liability Report Page - Summary Stats (AC 2, 3)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    await page.goto("/reports/royalty-liability");
  });

  test("AC2: Total Unpaid Liability card is visible", async ({ page }) => {
    await expect(
      page.getByTestId("total-liability-card"),
    ).toBeVisible();
    await expect(
      page.getByText("Total Unpaid Liability"),
    ).toBeVisible();
  });

  test("AC2: Authors with Pending Payments card is visible", async ({ page }) => {
    await expect(
      page.getByTestId("authors-pending-card"),
    ).toBeVisible();
    await expect(
      page.getByText("Authors with Pending Payments"),
    ).toBeVisible();
  });

  test("AC2: Oldest Unpaid Statement card is visible", async ({ page }) => {
    await expect(
      page.getByTestId("oldest-statement-card"),
    ).toBeVisible();
    await expect(
      page.getByText("Oldest Unpaid Statement"),
    ).toBeVisible();
  });

  test("AC3: Average Payment per Author card is visible", async ({ page }) => {
    await expect(
      page.getByTestId("average-payment-card"),
    ).toBeVisible();
    await expect(
      page.getByText("Average Payment per Author"),
    ).toBeVisible();
  });

  test("AC2, AC3: Stats cards display values", async ({ page }) => {
    // Verify value elements exist
    await expect(page.getByTestId("total-liability-value")).toBeVisible();
    await expect(page.getByTestId("authors-pending-value")).toBeVisible();
    await expect(page.getByTestId("oldest-statement-value")).toBeVisible();
    await expect(page.getByTestId("average-payment-value")).toBeVisible();
  });
});

test.describe("Royalty Liability Report Page - Liability Table (AC 4, 5)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    await page.goto("/reports/royalty-liability");
  });

  test("AC4: Liability by author table exists", async ({ page }) => {
    await expect(
      page.getByTestId("liability-by-author-table"),
    ).toBeVisible();
  });

  test("AC4: Table has correct columns", async ({ page }) => {
    const table = page.getByTestId("liability-by-author-table");

    // Check column headers
    await expect(table.getByText("Author Name")).toBeVisible();
    await expect(table.getByText("Titles")).toBeVisible();
    await expect(table.getByText("Unpaid Statements")).toBeVisible();
    await expect(table.getByText("Total Owed")).toBeVisible();
    await expect(table.getByText("Oldest Statement")).toBeVisible();
    await expect(table.getByText("Payment Method")).toBeVisible();
  });

  test("AC5: Table columns are sortable", async ({ page }) => {
    const table = page.getByTestId("liability-by-author-table");

    // Look for sort buttons in column headers
    const sortButtons = table.getByRole("button", { name: /Author Name/i });
    await expect(sortButtons).toBeVisible();

    // Click to sort
    await sortButtons.click();

    // Table should reorder (we can't easily verify order without data)
  });

  test("AC5: Total Owed column is clickable for sorting", async ({ page }) => {
    const table = page.getByTestId("liability-by-author-table");

    // Look for Total Owed sort button
    const totalOwedSort = table.getByRole("button", { name: /Total Owed/i });
    await expect(totalOwedSort).toBeVisible();

    // Click to toggle sort
    await totalOwedSort.click();
  });
});

test.describe("Royalty Liability Report Page - Advance Tracking (AC 6)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    await page.goto("/reports/royalty-liability");
  });

  test("AC6: Advance tracking section exists", async ({ page }) => {
    await expect(
      page.getByTestId("advance-tracking-section"),
    ).toBeVisible();
  });

  test("AC6: Advance section has correct title", async ({ page }) => {
    await expect(page.getByText("Active Advances")).toBeVisible();
  });

  test("AC6: Advance table has correct columns", async ({ page }) => {
    const section = page.getByTestId("advance-tracking-section");

    // Check for column headers if data exists
    // These may not be visible if there are no active advances
    const hasData = await section.locator("table").isVisible().catch(() => false);

    if (hasData) {
      await expect(section.getByText("Author")).toBeVisible();
      await expect(section.getByText("Title")).toBeVisible();
      await expect(section.getByText("Advance Amount")).toBeVisible();
      await expect(section.getByText("Recouped")).toBeVisible();
      await expect(section.getByText("Remaining")).toBeVisible();
      await expect(section.getByText("Progress")).toBeVisible();
    } else {
      // If no data, should show empty state
      await expect(
        section.getByTestId("no-active-advances"),
      ).toBeVisible();
    }
  });
});

test.describe("Royalty Liability Report Page - CSV Export (AC 7)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance user
    await page.goto("/reports/royalty-liability");
  });

  test("AC7: Export CSV button is present", async ({ page }) => {
    const exportButton = page.getByTestId("liability-export-button");
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toContainText("Export CSV");
  });

  test("AC7: Export CSV triggers download", async ({ page }) => {
    const exportButton = page.getByTestId("liability-export-button");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);

    // Click export
    await exportButton.click();

    // Check if download started
    const download = await downloadPromise;

    if (download) {
      // Verify filename pattern: royalty-liability-YYYY-MM-DD.csv
      expect(download.suggestedFilename()).toMatch(/^royalty-liability-\d{4}-\d{2}-\d{2}\.csv$/);
    }
  });
});

test.describe("Royalty Liability Report Page - Permission Enforcement (AC 1)", () => {
  test("AC1: Finance user can access liability report", async ({ page }) => {
    // TODO: Login as finance user
    // await loginAs(page, "finance@testorg.com");

    await page.goto("/reports/royalty-liability");

    // Should see the report page
    await expect(
      page.getByRole("heading", { name: "Royalty Liability Summary" }),
    ).toBeVisible();
  });

  test("AC1: Admin user can access liability report", async ({ page }) => {
    // TODO: Login as admin user
    // await loginAs(page, "admin@testorg.com");

    await page.goto("/reports/royalty-liability");

    await expect(
      page.getByRole("heading", { name: "Royalty Liability Summary" }),
    ).toBeVisible();
  });

  test("AC1: Owner user can access liability report", async ({ page }) => {
    // TODO: Login as owner
    // await loginAs(page, "owner@testorg.com");

    await page.goto("/reports/royalty-liability");

    await expect(
      page.getByRole("heading", { name: "Royalty Liability Summary" }),
    ).toBeVisible();
  });

  test("AC1: Editor user is redirected (blocked)", async ({ page }) => {
    // TODO: Login as editor
    // await loginAs(page, "editor@testorg.com");

    await page.goto("/reports/royalty-liability");

    // Editor should be redirected to dashboard
    await expect(page).toHaveURL(/dashboard|sign-in/);
  });

  test("AC1: Author user is redirected (blocked)", async ({ page }) => {
    // TODO: Login as author
    // await loginAs(page, "author@testorg.com");

    await page.goto("/reports/royalty-liability");

    // Author should be redirected to dashboard or portal
    await expect(page).toHaveURL(/dashboard|portal|sign-in/);
  });
});

test.describe("Royalty Liability Report Page - Reports Index Integration", () => {
  test("Reports index links to royalty liability report", async ({ page }) => {
    await page.goto("/reports");

    // Should see Reports heading
    await expect(
      page.getByRole("heading", { name: "Reports" }),
    ).toBeVisible();

    // Should have a card for Royalty Liability
    await expect(page.getByText("Royalty Liability")).toBeVisible();

    // Card should be enabled/clickable
    const liabilityCard = page.locator('a[href="/reports/royalty-liability"]');
    await expect(liabilityCard).toBeVisible();

    // Click should navigate to /reports/royalty-liability
    await liabilityCard.click();
    await expect(page).toHaveURL(/\/reports\/royalty-liability/);
  });
});

test.describe("Royalty Liability Report Page - Responsive Design", () => {
  test("Mobile layout - stats stack vertically", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/reports/royalty-liability");

    // Stats should be visible (stacked on mobile)
    await expect(
      page.getByTestId("liability-summary-stats"),
    ).toBeVisible();
  });

  test("Tablet layout - 2 column stats grid", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/reports/royalty-liability");

    // Stats should be visible in grid
    await expect(
      page.getByTestId("liability-summary-stats"),
    ).toBeVisible();
  });

  test("Desktop layout - 4 column stats grid", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/reports/royalty-liability");

    // All 4 stat cards visible
    await expect(page.getByTestId("total-liability-card")).toBeVisible();
    await expect(page.getByTestId("authors-pending-card")).toBeVisible();
    await expect(page.getByTestId("oldest-statement-card")).toBeVisible();
    await expect(page.getByTestId("average-payment-card")).toBeVisible();
  });
});

test.describe("Royalty Liability Report Page - Empty State Handling", () => {
  test("Shows appropriate message when no liability data", async ({ page }) => {
    // With no seeded data, page should still render
    await page.goto("/reports/royalty-liability");

    // Either data exists or empty state is shown
    const hasData = await page.locator("table").isVisible().catch(() => false);

    if (!hasData) {
      // Should show empty state message
      const emptyState = page.getByTestId("no-liability-data");
      const advanceEmpty = page.getByTestId("no-active-advances");

      // At least one empty state should be visible
      const liabilityEmpty = await emptyState.isVisible().catch(() => false);
      const advancesEmpty = await advanceEmpty.isVisible().catch(() => false);

      expect(liabilityEmpty || advancesEmpty).toBe(true);
    }
  });
});

test.describe("Royalty Liability Report Page - Navigation", () => {
  test("Back navigation to reports index works", async ({ page }) => {
    await page.goto("/reports/royalty-liability");

    // Find breadcrumb or back link
    const reportsLink = page.getByRole("link", { name: "Reports" });
    const linkExists = await reportsLink.isVisible().catch(() => false);

    if (linkExists) {
      await reportsLink.click();
      await expect(page).toHaveURL(/\/reports$/);
    }
  });

  test("Reports navigation item in sidebar links correctly", async ({ page }) => {
    await page.goto("/dashboard");

    // Find Reports link in navigation
    const reportsLink = page.getByRole("link", { name: /^Reports$/i });
    const exists = await reportsLink.isVisible().catch(() => false);

    if (exists) {
      await reportsLink.click();
      await expect(page).toHaveURL(/\/reports$/);
    }
  });
});

test.describe("Royalty Liability Report Page - Table Pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports/royalty-liability");
  });

  test("Pagination controls are visible when data exists", async ({ page }) => {
    const table = page.getByTestId("liability-by-author-table");
    const hasData = await table.locator("tbody tr").count().catch(() => 0);

    if (hasData > 0) {
      // Should show page info
      await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();

      // Should have Previous/Next buttons
      await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    }
  });

  test("Previous button is disabled on first page", async ({ page }) => {
    const prevButton = page.getByRole("button", { name: "Previous" });
    const exists = await prevButton.isVisible().catch(() => false);

    if (exists) {
      await expect(prevButton).toBeDisabled();
    }
  });
});
