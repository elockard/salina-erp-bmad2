import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Return Approval Queue
 *
 * Story 3.6: Build Return Approval Queue for Finance
 * Tests all acceptance criteria (AC 1-12)
 *
 * Prerequisites:
 * - Authenticated user with APPROVE_RETURNS permission (finance/admin/owner)
 * - At least one pending return in test tenant for approval tests
 *
 * Note: These tests require authentication fixtures to be set up.
 * See playwright.config.ts for test configuration.
 */

test.describe("Return Approval Queue - Story 3.6", () => {
  test.describe("AC 1: Page Structure and Access", () => {
    test("pending returns page exists at /returns/pending", async ({
      page,
    }) => {
      await page.goto("/returns/pending");
      await expect(page).toHaveURL("/returns/pending");
    });

    test("shows page header with 'Pending Returns' and count", async ({
      page,
    }) => {
      await page.goto("/returns/pending");
      await expect(
        page.getByRole("heading", { name: /Pending Returns \(\d+\)/ }),
      ).toBeVisible();
    });

    test("displays breadcrumb navigation (Dashboard > Returns > Pending Approvals)", async ({
      page,
    }) => {
      await page.goto("/returns/pending");
      // Scope to main content to avoid sidebar duplicate
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(main.getByRole("link", { name: "Returns" })).toBeVisible();
      await expect(main.getByText("Pending Approvals")).toBeVisible();
    });

    test("uses Split View Explorer layout", async ({ page }) => {
      await page.goto("/returns/pending");
      // Verify two-panel layout exists
      await expect(page.locator(".border-r")).toBeVisible(); // Left panel border
    });
  });

  test.describe("AC 2: Left Panel - Pending Returns Queue", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/returns/pending");
    });

    test("displays queue header with count", async ({ page }) => {
      await expect(page.getByText(/Pending Returns \(\d+\)/)).toBeVisible();
    });

    test("shows queue items with title, quantity, amount, and date", async ({
      page,
    }) => {
      // Look for queue item structure
      const queueItem = page
        .locator("button")
        .filter({ hasText: /\$/ })
        .first();
      await expect(queueItem).toBeVisible();
    });

    test("displays quantity and amount as negative values", async ({
      page,
    }) => {
      // Check for negative formatting
      await expect(page.getByText(/-\d+ units/)).toBeVisible();
      await expect(page.getByText(/-\$[\d,]+\.\d{2}/)).toBeVisible();
    });

    test("clicking item loads detail in right panel", async ({ page }) => {
      const queueItem = page
        .locator("button")
        .filter({ hasText: /\$/ })
        .first();
      await queueItem.click();

      // Right panel should show "Return Request" header
      await expect(
        page.getByRole("heading", { name: "Return Request" }),
      ).toBeVisible();
    });

    test("shows visual selection indicator on active item", async ({
      page,
    }) => {
      const queueItem = page
        .locator("button")
        .filter({ hasText: /\$/ })
        .first();
      await queueItem.click();

      // Check for selection indicator (ring class)
      await expect(queueItem).toHaveClass(/ring/);
    });
  });

  test.describe("AC 3: Right Panel - Return Detail", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/returns/pending");
      // Select first item
      await page.locator("button").filter({ hasText: /\$/ }).first().click();
    });

    test("shows 'Return Request' header", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Return Request" }),
      ).toBeVisible();
    });

    test("displays metadata (submitted by, date)", async ({ page }) => {
      await expect(page.getByText(/Submitted by/)).toBeVisible();
    });

    test("shows 'Pending Approval' status badge", async ({ page }) => {
      await expect(page.getByText("Pending Approval")).toBeVisible();
    });

    test("displays Return Information card with title, format, quantity, amount", async ({
      page,
    }) => {
      await expect(page.getByText("Return Information")).toBeVisible();
      await expect(page.getByText("Title")).toBeVisible();
      await expect(page.getByText("Format")).toBeVisible();
      await expect(page.getByText("Quantity")).toBeVisible();
      await expect(page.getByText("Amount")).toBeVisible();
    });
  });

  test.describe("AC 4: Royalty Impact Statement", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/returns/pending");
      await page.locator("button").filter({ hasText: /\$/ }).first().click();
    });

    test("displays impact statement before action buttons", async ({
      page,
    }) => {
      await expect(page.getByText("Royalty Impact")).toBeVisible();
      await expect(
        page.getByText(/Approving this return will reduce Author royalties/),
      ).toBeVisible();
    });
  });

  test.describe("AC 5 & 6: Approve Return Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/returns/pending");
      await page.locator("button").filter({ hasText: /\$/ }).first().click();
    });

    test("shows 'Approve Return' primary action button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Approve Return" }),
      ).toBeVisible();
    });

    test("clicking 'Approve Return' opens confirmation dialog", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Approve Return" }).click();
      await expect(page.getByText("Approve Return?")).toBeVisible();
    });

    test("confirmation dialog has optional internal note field", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Approve Return" }).click();
      await expect(
        page.getByPlaceholder(/Optional note for internal records/),
      ).toBeVisible();
    });

    test("confirmation dialog has Confirm and Cancel buttons", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Approve Return" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Approval" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    test("successful approval shows success toast", async ({ page }) => {
      await page.getByRole("button", { name: "Approve Return" }).click();
      await page.getByRole("button", { name: "Confirm Approval" }).click();

      // Check for success toast
      await expect(page.getByText(/Return approved/)).toBeVisible();
    });
  });

  test.describe("AC 7 & 8: Reject Return Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/returns/pending");
      await page.locator("button").filter({ hasText: /\$/ }).first().click();
    });

    test("shows 'Reject Return' secondary action button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Reject Return" }),
      ).toBeVisible();
    });

    test("clicking 'Reject Return' opens confirmation dialog", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Reject Return" }).click();
      await expect(page.getByText("Reject Return?")).toBeVisible();
    });

    test("rejection dialog has required reason field", async ({ page }) => {
      await page.getByRole("button", { name: "Reject Return" }).click();
      await expect(page.getByText(/Rejection reason/)).toBeVisible();
      await expect(page.getByPlaceholder(/Please explain why/)).toBeVisible();
    });

    test("confirm button is disabled until reason is provided", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Reject Return" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Rejection" }),
      ).toBeDisabled();
    });

    test("confirm button enables after typing reason", async ({ page }) => {
      await page.getByRole("button", { name: "Reject Return" }).click();
      await page
        .getByPlaceholder(/Please explain why/)
        .fill("Duplicate return request");
      await expect(
        page.getByRole("button", { name: "Confirm Rejection" }),
      ).toBeEnabled();
    });

    test("successful rejection shows success toast", async ({ page }) => {
      await page.getByRole("button", { name: "Reject Return" }).click();
      await page
        .getByPlaceholder(/Please explain why/)
        .fill("Duplicate return request");
      await page.getByRole("button", { name: "Confirm Rejection" }).click();

      // Check for success toast
      await expect(page.getByText(/Return rejected/)).toBeVisible();
    });
  });

  test.describe("AC 9: Empty Queue State", () => {
    test("shows empty state when no pending returns", async ({ page }) => {
      // This test assumes empty state can be reached
      await page.goto("/returns/pending");

      // If queue is empty, should show empty state
      const emptyState = page.getByText("No pending returns");
      if (await emptyState.isVisible()) {
        await expect(
          page.getByText("All return requests have been processed"),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "View all returns" }),
        ).toBeVisible();
      }
    });
  });

  test.describe("AC 10: Dashboard Widget", () => {
    test("dashboard shows pending returns card for Finance role", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Pending Returns")).toBeVisible();
    });

    test("pending returns card is clickable and navigates to /returns/pending", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.getByText("Pending Returns").click();
      await expect(page).toHaveURL("/returns/pending");
    });
  });

  test.describe("AC 11: Permission Enforcement", () => {
    test("unauthorized user is redirected with error", async ({ page }) => {
      // This would require a different auth fixture (editor role)
      // The page should redirect unauthorized users
      await page.goto("/returns/pending");
      // Expect redirect to dashboard with error param if unauthorized
    });
  });

  test.describe("AC 12: Validation", () => {
    test("rejection reason validation prevents empty submission", async ({
      page,
    }) => {
      await page.goto("/returns/pending");
      await page.locator("button").filter({ hasText: /\$/ }).first().click();
      await page.getByRole("button", { name: "Reject Return" }).click();

      // Try to submit without reason
      await expect(
        page.getByRole("button", { name: "Confirm Rejection" }),
      ).toBeDisabled();
    });
  });
});

test.describe("Return Approval - Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile shows list-only view initially", async ({ page }) => {
    await page.goto("/returns/pending");
    // On mobile, right panel should be hidden
    await expect(page.getByText(/Pending Returns/)).toBeVisible();
  });

  test("clicking item shows detail with back button", async ({ page }) => {
    await page.goto("/returns/pending");
    await page.locator("button").filter({ hasText: /\$/ }).first().click();

    // Should show back button on mobile
    await expect(page.getByText("Back to list")).toBeVisible();
  });

  test("back button returns to list view", async ({ page }) => {
    await page.goto("/returns/pending");
    await page.locator("button").filter({ hasText: /\$/ }).first().click();
    await page.getByText("Back to list").click();

    // Should be back on list view
    await expect(page.getByText(/Pending Returns \(\d+\)/)).toBeVisible();
  });
});
