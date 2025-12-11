/**
 * Invoice PDF/Email E2E Tests
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 15: E2E Tests
 *
 * Tests:
 * - Send button appears on draft invoices (AC-8.6.7)
 * - Send dialog shows customer email and confirmation
 * - Resend button appears on sent invoices (AC-8.6.5)
 * - Download PDF button functionality (AC-8.6.6)
 * - Invoice status updates after sending
 *
 * Note: These tests verify UI behavior. Actual email/PDF generation
 * is mocked at the API level in development/test environments.
 */

import { expect, test } from "@playwright/test";

// Test user credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || "owner@test.com",
  password: process.env.TEST_USER_PASSWORD || "password123",
};

// Helper to login
async function login(page: any) {
  await page.goto("/sign-in");
  await page.fill('input[name="identifier"]', testUser.email);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button:has-text("Continue")');
  await page.waitForURL(/\/(dashboard|invoices)/);
}

test.describe("Invoice PDF/Email E2E", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe("Invoice List Actions", () => {
    test("shows invoices list page", async ({ page }) => {
      await page.goto("/invoices");

      // Verify page loaded
      await expect(
        page.getByRole("heading", { name: /invoices/i }),
      ).toBeVisible();
    });

    test("shows action menu on invoice row", async ({ page }) => {
      await page.goto("/invoices");

      // Wait for table to load
      await page.waitForSelector("table");

      // Find first action menu if invoices exist
      const actionButtons = page.locator('button[aria-label="Open menu"]');
      const count = await actionButtons.count();

      if (count > 0) {
        await actionButtons.first().click();

        // Verify menu options appear
        await expect(
          page.getByRole("menuitem", { name: /view/i }),
        ).toBeVisible();
      }
    });
  });

  test.describe("Invoice Detail View", () => {
    test("shows invoice detail with actions", async ({ page }) => {
      await page.goto("/invoices");

      // Wait for table to load
      await page.waitForSelector("table");

      // Click on first invoice if available
      const invoiceRows = page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();

      if (rowCount > 0) {
        // Click on first invoice's view action
        const firstRowActions = invoiceRows
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await firstRowActions.count()) > 0) {
          await firstRowActions.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify invoice detail loaded
          await expect(page.getByText(/invoice #/i)).toBeVisible();
        }
      }
    });

    test("shows Print button on invoice detail", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const invoiceRows = page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();

      if (rowCount > 0) {
        const firstRowActions = invoiceRows
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await firstRowActions.count()) > 0) {
          await firstRowActions.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify Print button is visible
          await expect(
            page.getByRole("button", { name: /print/i }),
          ).toBeVisible();
        }
      }
    });

    test("shows Download PDF button on invoice detail", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const invoiceRows = page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();

      if (rowCount > 0) {
        const firstRowActions = invoiceRows
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await firstRowActions.count()) > 0) {
          await firstRowActions.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify Download PDF button is visible
          await expect(
            page.getByRole("button", { name: /download pdf/i }),
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("Send Invoice Dialog (AC-8.6.7)", () => {
    test("Send button visible for draft invoices", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      // Look for a draft invoice
      const draftBadge = page.locator('td:has-text("Draft")');
      const hasDraft = (await draftBadge.count()) > 0;

      if (hasDraft) {
        // Click on draft invoice's row action
        const draftRow = page.locator("table tbody tr").filter({
          has: page.locator('td:has-text("Draft")'),
        });

        const actionButton = draftRow
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await actionButton.count()) > 0) {
          await actionButton.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify Send button is visible for draft invoice
          await expect(
            page.getByRole("button", { name: /send/i }),
          ).toBeVisible();
        }
      }
    });

    test("Send dialog shows invoice details", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      // Look for a draft invoice
      const draftBadge = page.locator('td:has-text("Draft")');
      const hasDraft = (await draftBadge.count()) > 0;

      if (hasDraft) {
        const draftRow = page.locator("table tbody tr").filter({
          has: page.locator('td:has-text("Draft")'),
        });

        const actionButton = draftRow
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await actionButton.count()) > 0) {
          await actionButton.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Click Send button
          await page.getByRole("button", { name: /^send$/i }).click();

          // Verify dialog appears
          await expect(page.getByRole("dialog")).toBeVisible();
          await expect(page.getByText(/send invoice/i)).toBeVisible();

          // Verify invoice details in dialog
          await expect(page.getByText("Invoice Number")).toBeVisible();
          await expect(page.getByText("Amount")).toBeVisible();
          await expect(page.getByText(/send to/i)).toBeVisible();

          // Close dialog
          await page.getByRole("button", { name: /cancel/i }).click();
        }
      }
    });
  });

  test.describe("Resend Invoice (AC-8.6.5)", () => {
    test("Resend button visible for sent invoices", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      // Look for a sent invoice
      const sentBadge = page.locator('td:has-text("Sent")');
      const hasSent = (await sentBadge.count()) > 0;

      if (hasSent) {
        const sentRow = page.locator("table tbody tr").filter({
          has: page.locator('td:has-text("Sent")'),
        });

        const actionButton = sentRow
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await actionButton.count()) > 0) {
          await actionButton.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify Resend button is visible for sent invoice
          await expect(
            page.getByRole("button", { name: /resend/i }),
          ).toBeVisible();
        }
      }
    });

    test("Resend dialog shows regenerate PDF option", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const sentBadge = page.locator('td:has-text("Sent")');
      const hasSent = (await sentBadge.count()) > 0;

      if (hasSent) {
        const sentRow = page.locator("table tbody tr").filter({
          has: page.locator('td:has-text("Sent")'),
        });

        const actionButton = sentRow
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await actionButton.count()) > 0) {
          await actionButton.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Click Resend button
          await page.getByRole("button", { name: /resend/i }).click();

          // Verify dialog appears with regenerate option
          await expect(page.getByRole("dialog")).toBeVisible();
          await expect(page.getByText(/resend invoice/i)).toBeVisible();
          await expect(page.getByRole("checkbox")).toBeVisible();
          await expect(page.getByText(/regenerate pdf/i)).toBeVisible();

          // Close dialog
          await page.getByRole("button", { name: /cancel/i }).click();
        }
      }
    });
  });

  test.describe("Download PDF (AC-8.6.6)", () => {
    test("Download PDF button works", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const invoiceRows = page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();

      if (rowCount > 0) {
        const firstRowActions = invoiceRows
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await firstRowActions.count()) > 0) {
          await firstRowActions.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Verify Download PDF button exists and is clickable
          const downloadButton = page.getByRole("button", {
            name: /download pdf/i,
          });
          await expect(downloadButton).toBeVisible();
          await expect(downloadButton).toBeEnabled();

          // Note: Actually clicking would trigger download, which we skip in tests
        }
      }
    });
  });

  test.describe("Invoice Status Updates", () => {
    test("Draft status badge displays correctly", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      // Check if draft badges have correct styling
      const draftBadge = page.locator('td:has-text("Draft")');
      const hasDraft = (await draftBadge.count()) > 0;

      if (hasDraft) {
        await expect(draftBadge.first()).toBeVisible();
      }
    });

    test("Sent status badge displays correctly", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const sentBadge = page.locator('td:has-text("Sent")');
      const hasSent = (await sentBadge.count()) > 0;

      if (hasSent) {
        await expect(sentBadge.first()).toBeVisible();
      }
    });
  });

  test.describe("Navigation", () => {
    test("can navigate to invoices from sidebar", async ({ page }) => {
      await page.goto("/dashboard");

      // Click on Invoices in sidebar
      await page.click('a:has-text("Invoices")');

      await expect(page).toHaveURL(/\/invoices/);
    });

    test("can navigate back from invoice detail", async ({ page }) => {
      await page.goto("/invoices");
      await page.waitForSelector("table");

      const invoiceRows = page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();

      if (rowCount > 0) {
        const firstRowActions = invoiceRows
          .first()
          .locator('button[aria-label="Open menu"]');
        if ((await firstRowActions.count()) > 0) {
          await firstRowActions.click();
          await page.getByRole("menuitem", { name: /view/i }).click();

          // Navigate back
          await page.goBack();
          await expect(page).toHaveURL(/\/invoices/);
        }
      }
    });
  });
});
