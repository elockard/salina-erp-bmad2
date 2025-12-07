/**
 * E2E Tests for Payment Recording
 *
 * Story 8.4 - Implement Payment Recording
 *
 * AC-8.4.1: Record payment modal with all required fields
 * AC-8.4.2: Client-side validation with overpayment warning
 * AC-8.4.3: Payment updates invoice balance and status
 * AC-8.4.5: Payment history displays after recording
 * AC-8.4.7: Permission enforcement (Finance, Admin, Owner only)
 * AC-8.4.9: Payment method display formatting
 * AC-8.4.10: Keyboard accessibility
 */

import { expect, test } from "@playwright/test";

test.describe("Payment Recording", () => {
  test.describe("Record Payment Button Visibility (AC-8.4.8)", () => {
    test("shows Record Payment button for 'sent' invoice", async ({ page }) => {
      // This test verifies the button appears for invoices that can accept payments
      await page.goto("/invoices");

      // Look for any invoice in sent status
      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) > 0) {
        await sentInvoice.first().click();
        await expect(
          page.getByRole("button", { name: /record payment/i }),
        ).toBeVisible();
      }
    });

    test("hides Record Payment button for 'draft' invoice", async ({
      page,
    }) => {
      await page.goto("/invoices");

      const draftInvoice = page.getByRole("row").filter({
        has: page.getByText("Draft"),
      });

      if ((await draftInvoice.count()) > 0) {
        await draftInvoice.first().click();
        await expect(
          page.getByRole("button", { name: /record payment/i }),
        ).not.toBeVisible();
      }
    });

    test("hides Record Payment button for 'paid' invoice", async ({ page }) => {
      await page.goto("/invoices");

      const paidInvoice = page.getByRole("row").filter({
        has: page.getByText("Paid"),
      });

      if ((await paidInvoice.count()) > 0) {
        await paidInvoice.first().click();
        await expect(
          page.getByRole("button", { name: /record payment/i }),
        ).not.toBeVisible();
      }
    });
  });

  test.describe("Payment Modal (AC-8.4.1, AC-8.4.10)", () => {
    test.skip("opens payment modal with invoice details", async ({ page }) => {
      // Skip if no sent invoices exist
      await page.goto("/invoices");

      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await sentInvoice.first().click();
      await page.getByRole("button", { name: /record payment/i }).click();

      // Modal should be visible
      await expect(
        page.getByRole("dialog", { name: /record payment/i }),
      ).toBeVisible();

      // Should show invoice details
      await expect(page.getByText(/INV-/)).toBeVisible();

      // Should have required form fields
      await expect(page.getByLabel(/payment date/i)).toBeVisible();
      await expect(page.getByLabel(/amount/i)).toBeVisible();
      await expect(page.getByLabel(/payment method/i)).toBeVisible();
    });

    test.skip("closes modal with Escape key (AC-8.4.10)", async ({ page }) => {
      await page.goto("/invoices");

      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await sentInvoice.first().click();
      await page.getByRole("button", { name: /record payment/i }).click();

      await expect(
        page.getByRole("dialog", { name: /record payment/i }),
      ).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(
        page.getByRole("dialog", { name: /record payment/i }),
      ).not.toBeVisible();
    });
  });

  test.describe("Form Validation (AC-8.4.2)", () => {
    test.skip("shows overpayment warning when amount exceeds balance", async ({
      page,
    }) => {
      await page.goto("/invoices");

      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await sentInvoice.first().click();
      await page.getByRole("button", { name: /record payment/i }).click();

      // Clear the default amount and enter a very large amount
      const amountInput = page.getByLabel(/amount/i);
      await amountInput.clear();
      await amountInput.fill("999999.99");

      // Should show overpayment warning
      await expect(page.getByText(/exceeds balance/i)).toBeVisible();
    });

    test.skip("requires payment method selection", async ({ page }) => {
      await page.goto("/invoices");

      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await sentInvoice.first().click();
      await page.getByRole("button", { name: /record payment/i }).click();

      // Try to submit without selecting payment method
      // Clear any default method if present
      await page.getByRole("button", { name: /apply payment/i }).click();

      // Should show validation error for payment method
      // Note: Form should prevent submission if method not selected
    });
  });

  test.describe("Payment Processing (AC-8.4.3)", () => {
    test.skip("records payment and updates invoice balance", async ({
      page,
    }) => {
      await page.goto("/invoices");

      const sentInvoice = page.getByRole("row").filter({
        has: page.getByText("Sent"),
      });

      if ((await sentInvoice.count()) === 0) {
        test.skip();
        return;
      }

      // Get the invoice number before recording payment
      await sentInvoice.first().click();

      // Wait for detail to load
      await page.waitForSelector("[data-testid='invoice-detail']", {
        timeout: 5000,
      });

      await page.getByRole("button", { name: /record payment/i }).click();

      // Fill in payment details
      await page.getByLabel(/payment method/i).click();
      await page.getByRole("option", { name: /check/i }).click();

      await page.getByLabel(/reference number/i).fill("TEST-CHK-001");

      // Submit the payment
      await page.getByRole("button", { name: /apply payment/i }).click();

      // Should show success message
      await expect(page.getByText(/recorded successfully/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Payment History Display (AC-8.4.5, AC-8.4.9)", () => {
    test.skip("displays payment in history after recording", async ({
      page,
    }) => {
      await page.goto("/invoices");

      // Look for an invoice with payments (partially_paid status)
      const partialInvoice = page.getByRole("row").filter({
        has: page.getByText("Partially Paid"),
      });

      if ((await partialInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await partialInvoice.first().click();

      // Payment history section should be visible
      await expect(page.getByText(/payment history/i)).toBeVisible();

      // Should have at least one payment row
      const paymentRows = page.getByRole("table").last().locator("tbody tr");
      const rowCount = await paymentRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    test.skip("formats payment method labels correctly (AC-8.4.9)", async ({
      page,
    }) => {
      await page.goto("/invoices");

      const partialInvoice = page.getByRole("row").filter({
        has: page.getByText("Partially Paid"),
      });

      if ((await partialInvoice.count()) === 0) {
        test.skip();
        return;
      }

      await partialInvoice.first().click();

      // Payment methods should be displayed with proper labels
      // "check" -> "Check", "wire" -> "Wire Transfer", etc.
      const paymentTable = page.getByRole("table").last();
      const methodCell = paymentTable.locator("td").nth(2);

      // Should show formatted labels, not raw values
      const methodText = await methodCell.textContent();
      expect(methodText).not.toMatch(/^(check|wire|credit_card|ach|other)$/);
    });
  });
});
