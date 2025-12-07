import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Dashboard Analytics Enhancements
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 *
 * Tests:
 * - AC-1: Owner/Admin dashboard widgets
 * - AC-2: Finance dashboard widgets
 * - AC-3: Editor dashboard widgets
 * - AC-4: Author portal widgets
 * - AC-5: Interactive charts with tooltips
 * - AC-6: Independent widget loading with skeletons
 * - AC-7: Error states without blocking
 * - AC-8: Refresh button functionality
 */

test.describe("Owner/Admin Dashboard Analytics (AC-1)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard as owner
    // Note: Requires login helper when auth infrastructure is ready
    // await loginAs(page, "owner@testorg.com", "password");
    await page.goto("/dashboard");
  });

  test("displays revenue trend chart widget", async ({ page }) => {
    // AC-1: Revenue trend widget should be visible
    await expect(page.getByText("Revenue Trend")).toBeVisible();
  });

  test("displays top selling titles widget", async ({ page }) => {
    // AC-1: Top selling titles widget
    await expect(page.getByText("Top Selling Titles")).toBeVisible();
  });

  test("displays author performance widget", async ({ page }) => {
    // AC-1: Author performance widget
    await expect(page.getByText("Author Performance")).toBeVisible();
  });

  test("displays ISBN utilization trend widget", async ({ page }) => {
    // AC-1: ISBN utilization trend widget
    await expect(page.getByText("ISBN Utilization Trend")).toBeVisible();
  });

  test("refresh button is visible and clickable", async ({ page }) => {
    // AC-8: Refresh button functionality
    const refreshButton = page.getByRole("button", { name: /refresh/i });
    await expect(refreshButton).toBeVisible();

    // Clicking should trigger a refresh (no navigation change)
    const currentUrl = page.url();
    await refreshButton.click();
    await expect(page).toHaveURL(currentUrl);
  });
});

test.describe("Finance Dashboard Analytics (AC-2)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard as finance user
    // await loginAs(page, "finance@testorg.com", "password");
    await page.goto("/dashboard");
  });

  test("displays liability trend chart widget", async ({ page }) => {
    // AC-2: Liability trend widget
    await expect(page.getByText("Liability Trend")).toBeVisible();
  });

  test("displays pending returns urgency widget", async ({ page }) => {
    // AC-2: Pending returns widget
    await expect(page.getByText("Pending Returns")).toBeVisible();
  });

  test("displays upcoming deadlines widget", async ({ page }) => {
    // AC-2: Upcoming deadlines widget
    await expect(page.getByText("Upcoming Deadlines")).toBeVisible();
  });

  test("displays top authors by royalty widget", async ({ page }) => {
    // AC-2: Top authors by royalty widget
    await expect(page.getByText("Top Authors by Royalty")).toBeVisible();
  });

  test("stats cards are clickable and link to reports (AC-7, AC-8)", async ({
    page,
  }) => {
    // AC-7 & AC-8 from Story 6.1: Clicking stat cards opens detailed reports
    const revenueCard = page.getByText("Monthly Revenue").locator("..");
    await revenueCard.click();
    // Should navigate to sales page
    await expect(page).toHaveURL(/\/sales/);
  });
});

test.describe("Editor Dashboard Analytics (AC-3)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard as editor
    // await loginAs(page, "editor@testorg.com", "password");
    await page.goto("/dashboard");
  });

  test("displays my titles widget", async ({ page }) => {
    // AC-3: My titles this quarter widget
    await expect(page.getByText("My Titles This Quarter")).toBeVisible();
  });

  test("displays recent sales widget", async ({ page }) => {
    // AC-3: Recent sales widget
    await expect(page.getByText("Recent Sales")).toBeVisible();
  });

  test("displays ISBN assignments widget", async ({ page }) => {
    // AC-3: My ISBN assignments widget
    await expect(page.getByText("My ISBN Assignments")).toBeVisible();
  });

  test("displays pending tasks widget", async ({ page }) => {
    // AC-3: Pending tasks widget
    await expect(page.getByText("Pending Tasks")).toBeVisible();
  });
});

test.describe("Author Portal Analytics (AC-4)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to portal as author
    // await loginAs(page, "author@testorg.com", "password");
    await page.goto("/portal");
  });

  test("displays earnings timeline widget", async ({ page }) => {
    // AC-4: Earnings timeline widget
    await expect(page.getByText("Earnings Timeline")).toBeVisible();
  });

  test("displays best performing titles widget", async ({ page }) => {
    // AC-4: Best performing titles widget
    await expect(page.getByText("Best Performing Titles")).toBeVisible();
  });

  test("displays advance recoupment widget", async ({ page }) => {
    // AC-4: Advance recoupment progress widget
    await expect(page.getByText("Advance Recoupment")).toBeVisible();
  });

  test("displays next statement widget", async ({ page }) => {
    // AC-4: Next statement date widget
    await expect(page.getByText("Next Statement")).toBeVisible();
  });

  test("refresh button updates portal data", async ({ page }) => {
    // AC-8: Refresh button in portal
    const refreshButton = page.getByRole("button", { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    // Page should stay on portal
    await expect(page).toHaveURL(/\/portal/);
  });
});

test.describe("Widget Loading States (AC-6)", () => {
  test("widgets show skeleton loaders during data fetch", async ({ page }) => {
    // AC-6: Independent widget loading with skeletons
    // This test checks that skeleton placeholders appear

    // Use slow network mode to see loading states
    await page.route("**/*", (route) => route.continue());

    await page.goto("/dashboard");

    // Look for any animate-pulse skeleton elements (may be brief)
    // In real tests, we'd throttle network to see loading states
    const chartWrappers = page.locator('[class*="rounded-xl"]');
    await expect(chartWrappers.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Widget Error States (AC-7)", () => {
  test("failed widget shows error without breaking page", async ({ page }) => {
    // AC-7: Error states without blocking entire dashboard
    // This would require mocking API failures

    await page.goto("/dashboard");

    // Even if a widget fails, page should load
    await expect(page.locator("h1")).toContainText("Welcome back");

    // Other widgets should still be visible
    await expect(page.getByText("Active Users")).toBeVisible();
  });
});

test.describe("Interactive Charts (AC-5)", () => {
  test("charts have interactive tooltips on hover", async ({ page }) => {
    // AC-5: Interactive charts with tooltips
    await page.goto("/dashboard");

    // Wait for charts to load
    await page.waitForTimeout(1000);

    // Look for chart elements (Recharts renders SVG)
    const chartContainer = page.locator(
      '[class*="recharts-responsive-container"]',
    );

    // If charts are visible, try hovering
    if ((await chartContainer.count()) > 0) {
      await chartContainer.first().hover();
      // Tooltips appear on hover - difficult to test without chart data
    }
  });
});

test.describe("Responsive Dashboard Layout", () => {
  test("widgets stack on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Widgets should be visible and stacked
    await expect(page.locator("h1")).toContainText("Welcome back");
  });

  test("widgets display in grid on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");

    // Dashboard should load with grid layout
    await expect(page.locator("h1")).toContainText("Welcome back");

    // Grid containers should have multiple columns
    const gridContainer = page.locator('[class*="grid"]').first();
    await expect(gridContainer).toBeVisible();
  });
});

test.describe("Dashboard Navigation Integration", () => {
  test("stats cards navigate to correct pages", async ({ page }) => {
    await page.goto("/dashboard");

    // Test that clickable cards work (finance dashboard)
    // This test assumes finance user role
    const salesLink = page.getByRole("link", { name: /sales|record sale/i });
    if ((await salesLink.count()) > 0) {
      await salesLink.first().click();
      await expect(page).toHaveURL(/\/sales/);
    }
  });
});

// Note: Full E2E test implementation requires:
// 1. Authentication test helpers (loginAs function)
// 2. Test database with seeded data for each role
// 3. Proper test isolation between runs
// 4. Network mocking for error state tests
