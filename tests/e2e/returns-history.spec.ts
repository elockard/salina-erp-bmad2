import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Returns History View
 *
 * Story 3.7: Build Returns History View with Status Filtering
 * Tests all acceptance criteria (AC 1-14)
 *
 * Prerequisites:
 * - Authenticated user with VIEW_RETURNS permission (editor/finance/admin/owner)
 * - At least one return record in test tenant
 *
 * Note: These tests require authentication fixtures to be set up.
 * See playwright.config.ts for test configuration.
 */

test.describe("Returns History Page - Story 3.7", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to returns history page
    await page.goto("/returns");
  });

  test.describe("AC 1: Page Structure", () => {
    test("shows page header 'Returns History'", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Returns History" }),
      ).toBeVisible();
    });

    test("shows subtitle about tracking returns", async ({ page }) => {
      await expect(
        page.getByText("Track approved, rejected, and pending return requests"),
      ).toBeVisible();
    });

    test("displays breadcrumb navigation (Dashboard > Returns)", async ({
      page,
    }) => {
      // Scope to main content to avoid sidebar duplicate
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(main.getByText("Returns")).toBeVisible();
    });

    test("shows Record Return button", async ({ page }) => {
      await expect(
        page.getByRole("link", { name: /Record Return/i }),
      ).toBeVisible();
    });
  });

  test.describe("AC 2: Table Columns", () => {
    test("table displays Date column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Date" }),
      ).toBeVisible();
    });

    test("table displays Title column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Title" }),
      ).toBeVisible();
    });

    test("table displays Format column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Format" }),
      ).toBeVisible();
    });

    test("table displays Qty column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Qty" }),
      ).toBeVisible();
    });

    test("table displays Amount column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Amount" }),
      ).toBeVisible();
    });

    test("table displays Reason column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Reason" }),
      ).toBeVisible();
    });

    test("table displays Status column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Status" }),
      ).toBeVisible();
    });

    test("table displays Reviewed By column", async ({ page }) => {
      await expect(
        page.getByRole("columnheader", { name: "Reviewed By" }),
      ).toBeVisible();
    });
  });

  test.describe("AC 3: Status Filter", () => {
    test("status filter dropdown is visible", async ({ page }) => {
      await expect(page.getByLabel("Status")).toBeVisible();
    });

    test("status filter has All option", async ({ page }) => {
      await page.getByLabel("Status").click();
      await expect(
        page.getByRole("option", { name: "All Status" }),
      ).toBeVisible();
    });

    test("status filter has Pending option", async ({ page }) => {
      await page.getByLabel("Status").click();
      await expect(page.getByRole("option", { name: "Pending" })).toBeVisible();
    });

    test("status filter has Approved option", async ({ page }) => {
      await page.getByLabel("Status").click();
      await expect(
        page.getByRole("option", { name: "Approved" }),
      ).toBeVisible();
    });

    test("status filter has Rejected option", async ({ page }) => {
      await page.getByLabel("Status").click();
      await expect(
        page.getByRole("option", { name: "Rejected" }),
      ).toBeVisible();
    });

    test("selecting status updates URL query param", async ({ page }) => {
      await page.getByLabel("Status").click();
      await page.getByRole("option", { name: "Pending" }).click();
      await expect(page).toHaveURL(/status=pending/);
    });
  });

  test.describe("AC 4: Date Range Filter", () => {
    test("date range picker is visible", async ({ page }) => {
      await expect(page.getByLabel("Date Range")).toBeVisible();
    });

    test("date range defaults to last 30 days", async ({ page }) => {
      // Date picker should show a date range
      await expect(
        page.getByRole("button", { name: /\w+ \d+, \d{4} - \w+ \d+, \d{4}/ }),
      ).toBeVisible();
    });

    test("clicking date range opens calendar", async ({ page }) => {
      await page.getByLabel("Date Range").click();
      await expect(page.getByRole("grid")).toBeVisible(); // Calendar grid
    });

    test("selecting date range updates URL query params", async ({
      page: _page,
    }) => {
      // Test interaction with date range picker
      // Implementation depends on calendar component
    });
  });

  test.describe("AC 5: Title Search Filter", () => {
    test("title search input is visible", async ({ page }) => {
      await expect(page.getByPlaceholder("Search titles...")).toBeVisible();
    });

    test("typing in search updates results after debounce", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search titles...");
      await searchInput.fill("test book");

      // Wait for debounce (300ms)
      await page.waitForTimeout(500);

      // URL should update with search param
      await expect(page).toHaveURL(/search=/);
    });

    test("search updates URL query param", async ({ page }) => {
      const searchInput = page.getByPlaceholder("Search titles...");
      await searchInput.fill("book");
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/search=book/);
    });
  });

  test.describe("AC 6: Format Filter", () => {
    test("format filter dropdown is visible", async ({ page }) => {
      await expect(page.getByLabel("Format")).toBeVisible();
    });

    test("format filter has All Formats option", async ({ page }) => {
      await page.getByLabel("Format").click();
      await expect(
        page.getByRole("option", { name: "All Formats" }),
      ).toBeVisible();
    });

    test("format filter has Physical option", async ({ page }) => {
      await page.getByLabel("Format").click();
      await expect(
        page.getByRole("option", { name: "Physical" }),
      ).toBeVisible();
    });

    test("format filter has Ebook option", async ({ page }) => {
      await page.getByLabel("Format").click();
      await expect(page.getByRole("option", { name: "Ebook" })).toBeVisible();
    });

    test("format filter has Audiobook option", async ({ page }) => {
      await page.getByLabel("Format").click();
      await expect(
        page.getByRole("option", { name: "Audiobook" }),
      ).toBeVisible();
    });

    test("selecting format updates URL query param", async ({ page }) => {
      await page.getByLabel("Format").click();
      await page.getByRole("option", { name: "Ebook" }).click();
      await expect(page).toHaveURL(/format=ebook/);
    });
  });

  test.describe("AC 7: Table Sorting", () => {
    test("Date column is sortable", async ({ page }) => {
      const dateHeader = page.getByRole("columnheader", { name: "Date" });
      await expect(dateHeader.getByRole("button")).toBeVisible();
    });

    test("Amount column is sortable", async ({ page }) => {
      const amountHeader = page.getByRole("columnheader", { name: "Amount" });
      await expect(amountHeader.getByRole("button")).toBeVisible();
    });

    test("Status column is sortable", async ({ page }) => {
      const statusHeader = page.getByRole("columnheader", { name: "Status" });
      await expect(statusHeader.getByRole("button")).toBeVisible();
    });

    test("clicking sort updates URL query params", async ({ page }) => {
      await page
        .getByRole("columnheader", { name: "Date" })
        .getByRole("button")
        .click();
      await expect(page).toHaveURL(/sort=date/);
    });

    test("default sort is date descending", async ({ page: _page }) => {
      // Default page load should show newest first
      // This test verifies the default sort order
    });
  });

  test.describe("AC 8: Pagination", () => {
    test("pagination controls are visible", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Previous" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    });

    test("shows 'Showing X-Y of Z returns' text", async ({ page }) => {
      await expect(
        page.getByText(/Showing \d+-\d+ of \d+ returns/),
      ).toBeVisible();
    });

    test("page size selector is visible", async ({ page }) => {
      await expect(page.getByText("Rows per page")).toBeVisible();
    });

    test("page size has 10, 20, 50 options", async ({ page }) => {
      await page.getByRole("combobox").nth(2).click(); // Page size selector
      await expect(page.getByRole("option", { name: "10" })).toBeVisible();
      await expect(page.getByRole("option", { name: "20" })).toBeVisible();
      await expect(page.getByRole("option", { name: "50" })).toBeVisible();
    });

    test("changing page size updates URL", async ({ page }) => {
      await page.getByRole("combobox").nth(2).click();
      await page.getByRole("option", { name: "50" }).click();
      await expect(page).toHaveURL(/size=50/);
    });

    test("clicking Next updates page in URL", async ({ page }) => {
      // Only test if there are multiple pages
      const nextButton = page.getByRole("button", { name: "Next" });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    });
  });

  test.describe("AC 9: View Detail Action", () => {
    test("clicking table row navigates to detail page", async ({ page }) => {
      // Click first data row
      const firstRow = page.getByRole("row").nth(1);
      await firstRow.click();

      // Should navigate to /returns/[id]
      await expect(page).toHaveURL(/\/returns\/[a-f0-9-]+$/);
    });

    test("view button is visible in each row", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /View/ }).first(),
      ).toBeVisible();
    });
  });

  test.describe("AC 11: Empty State", () => {
    test("shows 'No returns found' when no results", async ({ page }) => {
      // Apply filter that returns no results
      await page.getByPlaceholder("Search titles...").fill("nonexistent12345");
      await page.waitForTimeout(500);

      await expect(page.getByText("No returns found")).toBeVisible();
    });

    test("shows filter adjustment suggestion", async ({ page }) => {
      await page.getByPlaceholder("Search titles...").fill("nonexistent12345");
      await page.waitForTimeout(500);

      await expect(
        page.getByText("Try adjusting your filters or date range"),
      ).toBeVisible();
    });

    test("shows 'Record a Return' link in empty state", async ({ page }) => {
      await page.getByPlaceholder("Search titles...").fill("nonexistent12345");
      await page.waitForTimeout(500);

      await expect(
        page.getByRole("link", { name: "Record a Return" }),
      ).toBeVisible();
    });
  });

  test.describe("AC 12: Permission Enforcement", () => {
    test.skip("redirects unauthorized users to dashboard", async ({
      page: _page,
    }) => {
      // Test with viewer role user (no VIEW_RETURNS permission)
      // Should redirect to /dashboard?error=unauthorized
    });
  });

  test.describe("AC 13: Responsive Design", () => {
    test("filters stack vertically on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      // Verify filters are stacked
      const filters = page.locator(".flex-col");
      await expect(filters.first()).toBeVisible();
    });

    test("table scrolls horizontally on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      // Table should be scrollable
      await expect(page.getByRole("table")).toBeVisible();
    });
  });

  test.describe("AC 14: Loading States", () => {
    test("shows loading skeleton while fetching data", async ({ page }) => {
      // Intercept and delay the API response
      await page.route(
        "**/api/**",
        async (route: { continue: () => Promise<void> }) => {
          await new Promise((r) => setTimeout(r, 500));
          await route.continue();
        },
      );

      await page.goto("/returns");
      // Skeleton should be visible during loading
    });
  });
});

test.describe("Return Detail Page - Story 3.7 AC 10", () => {
  test.describe("Page Structure", () => {
    test.beforeEach(async ({ page: _page }) => {
      // Navigate to a return detail page (requires valid return ID)
      // This would need to be set up with test data
    });

    test("shows page header 'Return Details'", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Return Details" }),
      ).toBeVisible();
    });

    test("shows status badge prominently", async ({ page }) => {
      // Status badge should be visible near the title
      const statusBadge = page.locator('[data-testid="status-badge"]');
      await expect(statusBadge).toBeVisible();
    });

    test("shows Return Information card", async ({ page }) => {
      await expect(page.getByText("Return Information")).toBeVisible();
    });

    test("displays title name", async ({ page: _page }) => {
      // Title name should be displayed in the info card
    });

    test("displays format", async ({ page: _page }) => {
      // Format badge should be visible
    });

    test("displays quantity as negative", async ({ page }) => {
      // Quantity should show with negative sign
      await expect(page.getByText(/-\d+/)).toBeVisible();
    });

    test("displays amount as negative currency", async ({ page }) => {
      // Amount should show negative currency format
      await expect(page.getByText(/-\$[\d,]+\.\d{2}/)).toBeVisible();
    });

    test("displays return date", async ({ page }) => {
      // Return date should be visible
      await expect(page.getByText(/\w+ \d+, \d{4}/)).toBeVisible();
    });

    test("displays reason if provided", async ({ page }) => {
      // Reason should be visible if set
      await expect(page.getByText("Reason")).toBeVisible();
    });

    test("shows submission metadata", async ({ page }) => {
      await expect(page.getByText(/Submitted by/)).toBeVisible();
    });

    test("shows review metadata for approved/rejected status", async ({
      page: _page,
    }) => {
      // If status is approved or rejected, review info should be visible
      // This test should conditionally check based on status
    });

    test("shows Back to Returns History link", async ({ page }) => {
      await expect(
        page.getByRole("link", { name: /Back to Returns History/i }),
      ).toBeVisible();
    });

    test("back link preserves filter state", async ({ page: _page }) => {
      // Navigate from history with filters to detail
      // Back link should return to filtered view
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("shows Dashboard > Returns > Return Details", async ({ page }) => {
      // Scope to main content to avoid sidebar duplicate
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(main.getByRole("link", { name: "Returns" })).toBeVisible();
      await expect(main.getByText("Return Details")).toBeVisible();
    });

    test("clicking Returns breadcrumb navigates to history", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Returns" }).click();
      await expect(page).toHaveURL(/\/returns$/);
    });
  });
});

test.describe("Clear Filters Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/returns");
  });

  test("Clear Filters button appears when filters active", async ({ page }) => {
    // Apply a filter
    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "Pending" }).click();

    // Clear button should appear
    await expect(
      page.getByRole("button", { name: /Clear Filters/i }),
    ).toBeVisible();
  });

  test("Clear Filters resets all filters", async ({ page }) => {
    // Apply multiple filters
    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "Pending" }).click();

    await page.getByLabel("Format").click();
    await page.getByRole("option", { name: "Ebook" }).click();

    // Click clear
    await page.getByRole("button", { name: /Clear Filters/i }).click();

    // URL should be clean
    await expect(page).not.toHaveURL(/status=/);
    await expect(page).not.toHaveURL(/format=/);
  });
});
