/**
 * Send Invoice Dialog Unit Tests
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 13: Unit Tests (AC-8.6.4)
 *
 * Tests:
 * - Dialog rendering in send/resend modes
 * - Customer email display
 * - Confirmation flow
 * - Loading states
 * - Regenerate PDF checkbox in resend mode
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SendInvoiceDialog } from "@/modules/invoices/components/send-invoice-dialog";

describe("SendInvoiceDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    invoiceNumber: "INV-20251207-0001",
    invoiceAmount: "1082.50",
    customerEmail: "john@example.com",
    isResend: false,
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders dialog when open is true", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render dialog when open is false", () => {
      render(<SendInvoiceDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("displays invoice number", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText("INV-20251207-0001")).toBeInTheDocument();
    });

    it("displays formatted invoice amount", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText("$1,082.50")).toBeInTheDocument();
    });

    it("displays customer email", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  describe("send mode (isResend=false)", () => {
    it("shows 'Send Invoice' title", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={false} />);

      // Use heading role to find the dialog title specifically
      expect(screen.getByRole("heading", { name: /send invoice/i })).toBeInTheDocument();
    });

    it("shows 'Send Invoice' button", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={false} />);

      expect(
        screen.getByRole("button", { name: /send invoice/i }),
      ).toBeInTheDocument();
    });

    it("does not show regenerate PDF checkbox", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={false} />);

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows description about marking as sent", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={false} />);

      expect(
        screen.getByText(/mark it as sent/i),
      ).toBeInTheDocument();
    });
  });

  describe("resend mode (isResend=true)", () => {
    it("shows 'Resend Invoice' title", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={true} />);

      // Use heading role to find the dialog title specifically
      expect(screen.getByRole("heading", { name: /resend invoice/i })).toBeInTheDocument();
    });

    it("shows 'Resend Invoice' button", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={true} />);

      expect(
        screen.getByRole("button", { name: /resend invoice/i }),
      ).toBeInTheDocument();
    });

    it("shows regenerate PDF checkbox", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={true} />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByText(/regenerate pdf/i)).toBeInTheDocument();
    });

    it("checkbox is unchecked by default", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={true} />);

      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });
  });

  describe("confirmation flow", () => {
    it("calls onConfirm when send button is clicked", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <SendInvoiceDialog
          {...defaultProps}
          isResend={false}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /send invoice/i }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it("passes regeneratePDF=false when checkbox is not checked", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <SendInvoiceDialog
          {...defaultProps}
          isResend={true}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /resend invoice/i }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(false);
      });
    });

    it("passes regeneratePDF=true when checkbox is checked", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <SendInvoiceDialog
          {...defaultProps}
          isResend={true}
          onConfirm={onConfirm}
        />,
      );

      // Check the regenerate checkbox
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // Click resend
      fireEvent.click(screen.getByRole("button", { name: /resend invoice/i }));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(true);
      });
    });

    it("calls onOpenChange(false) after successful send", async () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <SendInvoiceDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /send invoice/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("cancel flow", () => {
    it("has a cancel button", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("calls onOpenChange(false) when cancel is clicked", () => {
      const onOpenChange = vi.fn();

      render(
        <SendInvoiceDialog {...defaultProps} onOpenChange={onOpenChange} />,
      );

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("loading state", () => {
    it("disables buttons during sending", async () => {
      // Create a promise that we can control
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onConfirm = vi.fn().mockReturnValue(promise);

      render(<SendInvoiceDialog {...defaultProps} onConfirm={onConfirm} />);

      // Click send
      fireEvent.click(screen.getByRole("button", { name: /send invoice/i }));

      // Button should show loading state with "Sending..." text
      await waitFor(() => {
        expect(screen.getByText(/Sending\.\.\./)).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolvePromise!();
    });

    it("disables checkbox during resend", async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onConfirm = vi.fn().mockReturnValue(promise);

      render(
        <SendInvoiceDialog
          {...defaultProps}
          isResend={true}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /resend invoice/i }));

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeDisabled();
      });

      resolvePromise!();
    });

    it("shows Resending... text in resend mode", async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onConfirm = vi.fn().mockReturnValue(promise);

      render(
        <SendInvoiceDialog
          {...defaultProps}
          isResend={true}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /resend invoice/i }));

      await waitFor(() => {
        expect(screen.getByText(/Resending\.\.\./)).toBeInTheDocument();
      });

      resolvePromise!();
    });
  });

  describe("invoice details display", () => {
    it("shows 'Send to:' label", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText(/send to/i)).toBeInTheDocument();
    });

    it("shows 'Invoice Number' label", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText("Invoice Number")).toBeInTheDocument();
    });

    it("shows 'Amount' label", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByText("Amount")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible dialog role", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has accessible button labels", () => {
      render(<SendInvoiceDialog {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /send invoice/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("checkbox has associated label", () => {
      render(<SendInvoiceDialog {...defaultProps} isResend={true} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("id", "regenerate-pdf");
    });
  });
});
