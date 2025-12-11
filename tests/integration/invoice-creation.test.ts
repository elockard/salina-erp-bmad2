import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createInvoice,
  generateInvoiceNumber,
  searchCustomersAction,
} from "@/modules/invoices/actions";

/**
 * Integration tests for Invoice Creation
 *
 * Story 8.2: Build Invoice Creation Form
 *
 * AC-8.2.6: Server action saves invoice with all line items in transaction
 * AC-8.2.10: Permission check: Finance, Admin, Owner only
 */

// Create shared mock instances using vi.hoisted
const mockFindMany = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockSelectResult = vi.hoisted(() => vi.fn());
const mockFromResult = vi.hoisted(() => vi.fn());
const mockWhereResult = vi.hoisted(() => vi.fn());
const mockOrderByResult = vi.hoisted(() => vi.fn());
const mockLimitResult = vi.hoisted(() => vi.fn());
const mockReturning = vi.hoisted(() => vi.fn());
const mockValues = vi.hoisted(() =>
  vi.fn(() => ({ returning: mockReturning })),
);
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockValues })));
const mockRequirePermission = vi.hoisted(() => vi.fn());
const mockGetCurrentTenantId = vi.hoisted(() =>
  vi.fn(() => Promise.resolve("test-tenant-id")),
);
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockLogAuditEvent = vi.hoisted(() => vi.fn());

// Setup chainable mock structure
mockSelectResult.mockReturnValue({
  from: mockFromResult,
});
mockFromResult.mockReturnValue({
  where: mockWhereResult,
});
mockWhereResult.mockReturnValue({
  orderBy: mockOrderByResult,
});
mockOrderByResult.mockReturnValue({
  limit: mockLimitResult,
});
// Default to empty array
mockLimitResult.mockResolvedValue([]);

// Create mock db instance
const mockDbInstance = vi.hoisted(() => ({
  query: {
    invoices: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
    },
    contacts: {
      findMany: mockFindMany,
    },
  },
  select: mockSelectResult,
  insert: mockInsert,
}));

// Mock transaction
const mockTx = vi.hoisted(() => ({
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() =>
        Promise.resolve([
          {
            id: "test-invoice-id",
            invoice_number: "INV-20251206-0001",
            tenant_id: "test-tenant-id",
            customer_id: "test-customer-id",
            status: "draft",
            total: "100.00",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]),
      ),
    })),
  })),
}));

const mockTransaction = vi.hoisted(() =>
  vi.fn((callback: (tx: typeof mockTx) => Promise<unknown>) =>
    callback(mockTx),
  ),
);
const mockAdminDb = vi.hoisted(() => ({
  transaction: mockTransaction,
}));

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requirePermission: mockRequirePermission,
  getCurrentTenantId: mockGetCurrentTenantId,
  getCurrentUser: mockGetCurrentUser,
  getDb: vi.fn(() => Promise.resolve(mockDbInstance)),
}));

vi.mock("@/db", () => ({
  adminDb: mockAdminDb,
}));

vi.mock("@/db/schema/invoices", () => ({
  invoices: {
    id: "id",
    tenant_id: "tenant_id",
    invoice_number: "invoice_number",
    customer_id: "customer_id",
    invoice_date: "invoice_date",
    due_date: "due_date",
    status: "status",
    bill_to_address: "bill_to_address",
    ship_to_address: "ship_to_address",
    po_number: "po_number",
    payment_terms: "payment_terms",
    custom_terms_days: "custom_terms_days",
    shipping_method: "shipping_method",
    shipping_cost: "shipping_cost",
    subtotal: "subtotal",
    tax_rate: "tax_rate",
    tax_amount: "tax_amount",
    total: "total",
    amount_paid: "amount_paid",
    balance_due: "balance_due",
    notes: "notes",
    internal_notes: "internal_notes",
    created_by: "created_by",
  },
  invoiceLineItems: {
    id: "id",
    invoice_id: "invoice_id",
    line_number: "line_number",
    item_code: "item_code",
    description: "description",
    quantity: "quantity",
    unit_price: "unit_price",
    amount: "amount",
    title_id: "title_id",
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/modules/contacts/queries", () => ({
  searchContacts: vi.fn(() =>
    Promise.resolve([
      {
        id: "customer-1",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        roles: [{ role: "customer", role_specific_data: {} }],
      },
    ]),
  ),
}));

describe("generateInvoiceNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetCurrentTenantId.mockResolvedValue("test-tenant-id");
    mockLimitResult.mockResolvedValue([]); // No existing invoices
  });

  test("generates invoice number with format INV-YYYYMMDD-0001 for first invoice", async () => {
    const result = await generateInvoiceNumber();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceNumber).toMatch(/^INV-\d{8}-0001$/);
    }
  });

  test("requires permission", async () => {
    mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

    const result = await generateInvoiceNumber();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "You do not have permission to create invoices",
      );
    }
  });

  test("increments sequence number when invoices exist for today", async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    mockLimitResult.mockResolvedValue([
      { invoice_number: `INV-${dateStr}-0005` },
    ]);

    const result = await generateInvoiceNumber();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceNumber).toBe(`INV-${dateStr}-0006`);
    }
  });
});

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetCurrentTenantId.mockResolvedValue("test-tenant-id");
    mockGetCurrentUser.mockResolvedValue({
      id: "test-user-id",
      email: "user@example.com",
      role: "admin",
    });
    mockLimitResult.mockResolvedValue([]); // No existing invoices
  });

  test("creates invoice with valid data", async () => {
    const input = {
      customerId: "test-customer-id",
      invoiceDate: new Date("2024-01-15"),
      dueDate: new Date("2024-02-14"),
      paymentTerms: "net_30" as const,
      billToAddress: {
        line1: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "90210",
      },
      shippingCost: "10.00",
      taxRate: "0.0825",
      lineItems: [
        {
          lineNumber: 1,
          description: "Test Item",
          quantity: "2",
          unitPrice: "50.00",
          amount: "100.00",
        },
      ],
    };

    const result = await createInvoice(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoice).toBeDefined();
      expect(result.data.invoice.invoice_number).toMatch(/^INV-\d{8}-\d{4}$/);
    }
  });

  test("requires permission to create invoice", async () => {
    mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

    const input = {
      customerId: "test-customer-id",
      invoiceDate: new Date(),
      dueDate: new Date(),
      paymentTerms: "net_30" as const,
      billToAddress: {},
      shippingCost: "0.00",
      taxRate: "0",
      lineItems: [
        {
          lineNumber: 1,
          description: "Item",
          quantity: "1",
          unitPrice: "100.00",
          amount: "100.00",
        },
      ],
    };

    const result = await createInvoice(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "You do not have permission to create invoices",
      );
    }
  });

  test("requires at least one line item", async () => {
    const input = {
      customerId: "test-customer-id",
      invoiceDate: new Date(),
      dueDate: new Date(),
      paymentTerms: "net_30" as const,
      billToAddress: {},
      shippingCost: "0.00",
      taxRate: "0",
      lineItems: [],
    };

    const result = await createInvoice(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invoice must have at least one line item");
    }
  });

  test("logs audit event after successful creation", async () => {
    const input = {
      customerId: "test-customer-id",
      invoiceDate: new Date("2024-01-15"),
      dueDate: new Date("2024-02-14"),
      paymentTerms: "net_30" as const,
      billToAddress: { line1: "123 Main St" },
      shippingCost: "0.00",
      taxRate: "0",
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

    await createInvoice(input);

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "test-tenant-id",
        userId: "test-user-id",
        actionType: "CREATE",
        resourceType: "invoice",
      }),
    );
  });
});

describe("searchCustomersAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns customers matching search query", async () => {
    const result = await searchCustomersAction("John");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].first_name).toBe("John");
    }
  });

  test("filters to only contacts with customer role", async () => {
    const result = await searchCustomersAction("test");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
      // All returned contacts should have customer role
      for (const contact of result.data) {
        expect(contact.roles.some((r) => r.role === "customer")).toBe(true);
      }
    }
  });
});

describe("Permission Enforcement (AC-8.2.10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("generateInvoiceNumber checks for finance/admin/owner role", async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetCurrentTenantId.mockResolvedValue("test-tenant-id");
    mockLimitResult.mockResolvedValue([]);

    await generateInvoiceNumber();

    expect(mockRequirePermission).toHaveBeenCalledWith([
      "finance",
      "admin",
      "owner",
    ]);
  });

  test("createInvoice checks for finance/admin/owner role", async () => {
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetCurrentTenantId.mockResolvedValue("test-tenant-id");
    mockGetCurrentUser.mockResolvedValue({ id: "user-id" });
    mockLimitResult.mockResolvedValue([]);

    const input = {
      customerId: "test-customer-id",
      invoiceDate: new Date(),
      dueDate: new Date(),
      paymentTerms: "net_30" as const,
      billToAddress: {},
      shippingCost: "0.00",
      taxRate: "0",
      lineItems: [
        {
          lineNumber: 1,
          description: "Item",
          quantity: "1",
          unitPrice: "100.00",
          amount: "100.00",
        },
      ],
    };

    await createInvoice(input);

    expect(mockRequirePermission).toHaveBeenCalledWith([
      "finance",
      "admin",
      "owner",
    ]);
  });
});
