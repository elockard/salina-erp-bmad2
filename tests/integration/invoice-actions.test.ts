/**
 * Invoice Actions Integration Tests
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 13: Integration Tests
 *
 * Tests:
 * - updateInvoice action validation and execution
 * - voidInvoice action validation and execution
 * - Permission enforcement
 * - Status transition validation
 */

import { describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    role: "owner",
    tenant_id: "test-tenant-id",
  }),
  getDb: vi.fn().mockResolvedValue({
    query: {
      invoices: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  }),
}));

// Mock the audit module
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock the admin database
vi.mock("@/db", () => ({
  adminDb: {
    transaction: vi.fn((callback) =>
      callback({
        delete: vi.fn().mockReturnValue({
          where: vi.fn(),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "test-invoice-id" }]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn(),
        }),
      }),
    ),
  },
}));

describe("Invoice Actions Integration Tests", () => {
  describe("updateInvoice", () => {
    it("should reject update for non-draft invoices", async () => {
      // Import after mocks are set up
      const { getDb } = await import("@/lib/auth");
      const { updateInvoice } = await import("@/modules/invoices/actions");

      // Mock the database to return a sent invoice
      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue({
              id: "test-invoice-id",
              status: "sent", // Non-draft
              tenant_id: "test-tenant-id",
            }),
          },
        },
      } as any);

      const input = {
        customerId: "cust-1",
        invoiceDate: new Date(),
        dueDate: new Date(),
        paymentTerms: "net_30" as const,
        billToAddress: {},
        shippingCost: "0.00",
        taxRate: "0.0825",
        lineItems: [
          {
            lineNumber: 1,
            description: "Test Item",
            quantity: "1",
            unitPrice: "100.00",
            amount: "100.00",
          },
        ],
      };

      const result = await updateInvoice("test-invoice-id", input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Only draft invoices can be edited");
      }
    });

    it("should reject update with empty line items", async () => {
      const { getDb } = await import("@/lib/auth");
      const { updateInvoice } = await import("@/modules/invoices/actions");

      // Mock the database to return a draft invoice
      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue({
              id: "test-invoice-id",
              status: "draft",
              tenant_id: "test-tenant-id",
            }),
          },
        },
      } as any);

      const input = {
        customerId: "cust-1",
        invoiceDate: new Date(),
        dueDate: new Date(),
        paymentTerms: "net_30" as const,
        billToAddress: {},
        shippingCost: "0.00",
        taxRate: "0.0825",
        lineItems: [], // Empty
      };

      const result = await updateInvoice("test-invoice-id", input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invoice must have at least one line item");
      }
    });
  });

  describe("voidInvoice", () => {
    it("should reject voiding a paid invoice", async () => {
      const { getDb } = await import("@/lib/auth");
      const { voidInvoice } = await import("@/modules/invoices/actions");

      // Mock the database to return a paid invoice
      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue({
              id: "test-invoice-id",
              status: "paid",
              tenant_id: "test-tenant-id",
            }),
          },
        },
      } as any);

      const result = await voidInvoice("test-invoice-id", "Test reason");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cannot void a paid invoice");
      }
    });

    it("should reject voiding an already void invoice", async () => {
      const { getDb } = await import("@/lib/auth");
      const { voidInvoice } = await import("@/modules/invoices/actions");

      // Mock the database to return a void invoice
      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue({
              id: "test-invoice-id",
              status: "void",
              tenant_id: "test-tenant-id",
            }),
          },
        },
      } as any);

      const result = await voidInvoice("test-invoice-id", "Test reason");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invoice is already void");
      }
    });

    it("should return error for non-existent invoice", async () => {
      const { getDb } = await import("@/lib/auth");
      const { voidInvoice } = await import("@/modules/invoices/actions");

      // Mock the database to return null (not found)
      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      } as any);

      const result = await voidInvoice("non-existent-id", "Test reason");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invoice not found");
      }
    });
  });

  describe("Permission Enforcement", () => {
    it("should reject unauthorized users for updateInvoice", async () => {
      const { requirePermission } = await import("@/lib/auth");
      const { updateInvoice } = await import("@/modules/invoices/actions");

      // Mock permission rejection
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const input = {
        customerId: "cust-1",
        invoiceDate: new Date(),
        dueDate: new Date(),
        paymentTerms: "net_30" as const,
        billToAddress: {},
        shippingCost: "0.00",
        taxRate: "0.0825",
        lineItems: [
          {
            lineNumber: 1,
            description: "Test",
            quantity: "1",
            unitPrice: "100.00",
            amount: "100.00",
          },
        ],
      };

      const result = await updateInvoice("test-id", input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "You do not have permission to edit invoices",
        );
      }
    });

    it("should reject unauthorized users for voidInvoice", async () => {
      const { requirePermission } = await import("@/lib/auth");
      const { voidInvoice } = await import("@/modules/invoices/actions");

      // Mock permission rejection
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await voidInvoice("test-id", "reason");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "You do not have permission to void invoices",
        );
      }
    });
  });
});
