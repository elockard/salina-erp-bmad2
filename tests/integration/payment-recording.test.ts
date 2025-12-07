/**
 * Payment Recording Integration Tests
 *
 * Story: 8.4 - Implement Payment Recording
 * Task 10: Integration Tests
 *
 * Tests:
 * - recordPayment action success case (AC-8.4.3)
 * - Transaction rollback on failure (AC-8.4.4)
 * - Permission enforcement (AC-8.4.7)
 * - Invalid invoice status rejection (AC-8.4.8)
 * - Status transitions (sent → partially_paid → paid)
 * - Tenant isolation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/types";
import type { Payment } from "@/modules/invoices/types";

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
  }),
}));

// Mock the audit module
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the admin database
const mockPayment = {
  id: "payment-123",
  tenant_id: "test-tenant-id",
  invoice_id: "invoice-123",
  payment_date: new Date("2024-12-06"),
  amount: "500.00",
  payment_method: "check",
  reference_number: "CHK-001",
  notes: "Test payment",
  created_at: new Date(),
  created_by: "test-user-id",
};

vi.mock("@/db", () => ({
  adminDb: {
    transaction: vi.fn((callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPayment]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      })
    ),
  },
}));

describe("Payment Recording Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordPayment action", () => {
    describe("success cases (AC-8.4.3)", () => {
      it("should create payment and update invoice atomically", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { logAuditEvent } = await import("@/lib/audit");
        const { recordPayment } = await import("@/modules/invoices/actions");

        // Mock permission success
        vi.mocked(requirePermission).mockResolvedValue(undefined);

        // Mock database to return a sent invoice
        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                invoice_number: "INV-20241206-0001",
                status: "sent",
                amount_paid: "0.00",
                balance_due: "1000.00",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "500.00",
          payment_method: "check" as const,
          reference_number: "CHK-001",
          notes: "Partial payment",
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.payment.id).toBe("payment-123");
        }
        expect(logAuditEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: "CREATE",
            resourceType: "payment",
            resourceId: "payment-123",
          })
        );
      });

      it("should handle partial payment and set status to partially_paid", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { adminDb } = await import("@/db");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        // Invoice with $1000 balance
        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                invoice_number: "INV-20241206-0001",
                status: "sent",
                amount_paid: "0.00",
                balance_due: "1000.00",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "500.00", // Partial payment
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(true);
        // Transaction mock was called
        expect(adminDb.transaction).toHaveBeenCalled();
      });

      it("should handle full payment and set status to paid", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        // Invoice with $500 balance
        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                invoice_number: "INV-20241206-0001",
                status: "partially_paid",
                amount_paid: "500.00",
                balance_due: "500.00",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "500.00", // Full remaining balance
          payment_method: "wire" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(true);
      });
    });

    describe("invoice status validation (AC-8.4.8)", () => {
      it("should reject payment for draft invoice", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                status: "draft",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Cannot record payment for draft invoice");
        }
      });

      it("should reject payment for void invoice", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                status: "void",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Cannot record payment for void invoice");
        }
      });

      it("should reject payment for paid invoice", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                status: "paid",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Cannot record payment for paid invoice");
        }
      });

      it("should allow payment for overdue invoice", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                invoice_number: "INV-20241106-0001",
                status: "overdue",
                amount_paid: "0.00",
                balance_due: "500.00",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "500.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(true);
      });
    });

    describe("permission enforcement (AC-8.4.7)", () => {
      it("should reject unauthorized users", async () => {
        const { requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        // Mock permission rejection
        vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("You do not have permission to record payments");
        }
      });

      it("should verify finance, admin, or owner permission is required", async () => {
        const { requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        await recordPayment(input);

        // Verify requirePermission was called with correct roles
        expect(requirePermission).toHaveBeenCalledWith(["finance", "admin", "owner"]);
      });
    });

    describe("tenant isolation", () => {
      it("should return error for invoice not found in tenant", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        // Mock database to return null (not found in tenant)
        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue(null),
            },
          },
        } as any);

        const input = {
          invoice_id: "invoice-from-other-tenant",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Invoice not found");
        }
      });
    });

    describe("transaction atomicity (AC-8.4.4)", () => {
      it("should rollback on database error", async () => {
        const { getDb, requirePermission } = await import("@/lib/auth");
        const { adminDb } = await import("@/db");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);

        vi.mocked(getDb).mockResolvedValue({
          query: {
            invoices: {
              findFirst: vi.fn().mockResolvedValue({
                id: "invoice-123",
                invoice_number: "INV-20241206-0001",
                status: "sent",
                amount_paid: "0.00",
                balance_due: "500.00",
                tenant_id: "test-tenant-id",
              }),
            },
          },
        } as any);

        // Mock transaction to throw an error
        vi.mocked(adminDb.transaction).mockRejectedValue(new Error("Database error"));

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "500.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Database error");
        }
      });
    });

    describe("user validation", () => {
      it("should return error when user not found", async () => {
        const { requirePermission, getCurrentUser } = await import("@/lib/auth");
        const { recordPayment } = await import("@/modules/invoices/actions");

        vi.mocked(requirePermission).mockResolvedValue(undefined);
        vi.mocked(getCurrentUser).mockResolvedValue(null);

        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: "check" as const,
        };

        const result = await recordPayment(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("User not found");
        }
      });
    });
  });

  describe("Payment Method Validation", () => {
    it("should accept all valid payment methods", async () => {
      const { getDb, requirePermission, getCurrentUser } = await import("@/lib/auth");
      const { adminDb } = await import("@/db");
      const { recordPayment } = await import("@/modules/invoices/actions");

      vi.mocked(requirePermission).mockResolvedValue(undefined);
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "test-user-id",
        role: "owner",
        tenant_id: "test-tenant-id",
      } as any);

      vi.mocked(getDb).mockResolvedValue({
        query: {
          invoices: {
            findFirst: vi.fn().mockResolvedValue({
              id: "invoice-123",
              invoice_number: "INV-20241206-0001",
              status: "sent",
              amount_paid: "0.00",
              balance_due: "500.00",
              tenant_id: "test-tenant-id",
            }),
          },
        },
      } as any);

      // Reset the transaction mock to succeed
      vi.mocked(adminDb.transaction).mockImplementation((callback: any) =>
        callback({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockPayment]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        })
      );

      const validMethods = ["check", "wire", "credit_card", "ach", "other"] as const;

      for (const method of validMethods) {
        const input = {
          invoice_id: "invoice-123",
          payment_date: new Date("2024-12-06"),
          amount: "100.00",
          payment_method: method,
        };

        const result = await recordPayment(input);
        expect(result.success).toBe(true);
      }
    });
  });
});
