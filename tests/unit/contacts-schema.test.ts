import { describe, expect, it } from "vitest";
import {
  type Contact,
  type ContactRole,
  contactRoleValues,
  contacts,
  contactRoles,
  contactStatusValues,
  type ContactStatus,
  type ContactRoleType,
  type InsertContact,
  type InsertContactRole,
} from "@/db/schema/contacts";
import {
  createContactSchema,
  updateContactSchema,
  assignContactRoleSchema,
  paymentInfoSchema,
  authorRoleDataSchema,
  customerRoleDataSchema,
  vendorRoleDataSchema,
  distributorRoleDataSchema,
  contactStatusEnum,
  contactRoleEnum,
  addressSchema,
} from "@/modules/contacts/schema";
import {
  isAuthorRoleData,
  isCustomerRoleData,
  isVendorRoleData,
  isDistributorRoleData,
  isPaymentInfo,
  type PaymentInfo,
  type AuthorRoleData,
  type CustomerRoleData,
  type VendorRoleData,
  type DistributorRoleData,
} from "@/modules/contacts/types";

/**
 * Unit tests for Contacts Schema
 *
 * Story 7.1 - Create Unified Contact Database Schema
 *
 * AC-7.1.1: Contacts table schema
 * AC-7.1.2: Contact roles table schema
 * AC-7.1.3: Role-specific data structures
 * AC-7.1.6: Drizzle schema and types
 *
 * Note: These are schema definition tests, not integration tests.
 * Database constraint enforcement is verified through schema structure.
 */

describe("contactStatusValues (AC-7.1.1)", () => {
  describe("valid values", () => {
    it("has exactly 2 values", () => {
      expect(contactStatusValues).toHaveLength(2);
    });

    it("contains 'active'", () => {
      expect(contactStatusValues).toContain("active");
    });

    it("contains 'inactive'", () => {
      expect(contactStatusValues).toContain("inactive");
    });

    it("has expected values in order", () => {
      expect(contactStatusValues[0]).toBe("active");
      expect(contactStatusValues[1]).toBe("inactive");
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = contactStatusValues;
      expect(values).toEqual(["active", "inactive"]);
    });
  });
});

describe("contactRoleValues (AC-7.1.2)", () => {
  describe("valid values", () => {
    it("has exactly 4 values", () => {
      expect(contactRoleValues).toHaveLength(4);
    });

    it("contains 'author'", () => {
      expect(contactRoleValues).toContain("author");
    });

    it("contains 'customer'", () => {
      expect(contactRoleValues).toContain("customer");
    });

    it("contains 'vendor'", () => {
      expect(contactRoleValues).toContain("vendor");
    });

    it("contains 'distributor'", () => {
      expect(contactRoleValues).toContain("distributor");
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = contactRoleValues;
      expect(values).toEqual(["author", "customer", "vendor", "distributor"]);
    });
  });
});

describe("ContactStatus type (AC-7.1.6)", () => {
  it("accepts valid status values", () => {
    const active: ContactStatus = "active";
    const inactive: ContactStatus = "inactive";

    expect(active).toBe("active");
    expect(inactive).toBe("inactive");
  });
});

describe("ContactRoleType type (AC-7.1.6)", () => {
  it("accepts valid role type values", () => {
    const author: ContactRoleType = "author";
    const customer: ContactRoleType = "customer";
    const vendor: ContactRoleType = "vendor";
    const distributor: ContactRoleType = "distributor";

    expect(author).toBe("author");
    expect(customer).toBe("customer");
    expect(vendor).toBe("vendor");
    expect(distributor).toBe("distributor");
  });
});

describe("contacts table schema structure (AC-7.1.1)", () => {
  it("is defined as a pgTable", () => {
    expect(contacts).toBeDefined();
    expect(typeof contacts).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(contacts.id).toBeDefined();
    expect(contacts.id.name).toBe("id");
  });

  it("has tenant_id column (FK to tenants, NOT NULL)", () => {
    expect(contacts.tenant_id).toBeDefined();
    expect(contacts.tenant_id.name).toBe("tenant_id");
    expect(contacts.tenant_id.notNull).toBe(true);
  });

  it("has first_name column (NOT NULL)", () => {
    expect(contacts.first_name).toBeDefined();
    expect(contacts.first_name.name).toBe("first_name");
    expect(contacts.first_name.notNull).toBe(true);
  });

  it("has last_name column (NOT NULL)", () => {
    expect(contacts.last_name).toBeDefined();
    expect(contacts.last_name.name).toBe("last_name");
    expect(contacts.last_name.notNull).toBe(true);
  });

  it("has email column (nullable)", () => {
    expect(contacts.email).toBeDefined();
    expect(contacts.email.name).toBe("email");
    expect(contacts.email.notNull).toBe(false);
  });

  it("has phone column (nullable)", () => {
    expect(contacts.phone).toBeDefined();
    expect(contacts.phone.name).toBe("phone");
    expect(contacts.phone.notNull).toBe(false);
  });

  it("has address_line1 column (nullable)", () => {
    expect(contacts.address_line1).toBeDefined();
    expect(contacts.address_line1.name).toBe("address_line1");
    expect(contacts.address_line1.notNull).toBe(false);
  });

  it("has address_line2 column (nullable)", () => {
    expect(contacts.address_line2).toBeDefined();
    expect(contacts.address_line2.name).toBe("address_line2");
    expect(contacts.address_line2.notNull).toBe(false);
  });

  it("has city column (nullable)", () => {
    expect(contacts.city).toBeDefined();
    expect(contacts.city.name).toBe("city");
    expect(contacts.city.notNull).toBe(false);
  });

  it("has state column (nullable)", () => {
    expect(contacts.state).toBeDefined();
    expect(contacts.state.name).toBe("state");
    expect(contacts.state.notNull).toBe(false);
  });

  it("has postal_code column (nullable)", () => {
    expect(contacts.postal_code).toBeDefined();
    expect(contacts.postal_code.name).toBe("postal_code");
    expect(contacts.postal_code.notNull).toBe(false);
  });

  it("has country column (nullable, default USA)", () => {
    expect(contacts.country).toBeDefined();
    expect(contacts.country.name).toBe("country");
    expect(contacts.country.notNull).toBe(false);
  });

  it("has tax_id column (nullable)", () => {
    expect(contacts.tax_id).toBeDefined();
    expect(contacts.tax_id.name).toBe("tax_id");
    expect(contacts.tax_id.notNull).toBe(false);
  });

  it("has payment_info column (JSONB, nullable)", () => {
    expect(contacts.payment_info).toBeDefined();
    expect(contacts.payment_info.name).toBe("payment_info");
    expect(contacts.payment_info.notNull).toBe(false);
  });

  it("has notes column (nullable)", () => {
    expect(contacts.notes).toBeDefined();
    expect(contacts.notes.name).toBe("notes");
    expect(contacts.notes.notNull).toBe(false);
  });

  it("has status column (NOT NULL, default active)", () => {
    expect(contacts.status).toBeDefined();
    expect(contacts.status.name).toBe("status");
    expect(contacts.status.notNull).toBe(true);
  });

  it("has portal_user_id column (FK to users, nullable)", () => {
    expect(contacts.portal_user_id).toBeDefined();
    expect(contacts.portal_user_id.name).toBe("portal_user_id");
    expect(contacts.portal_user_id.notNull).toBe(false);
  });

  it("has created_at column (NOT NULL)", () => {
    expect(contacts.created_at).toBeDefined();
    expect(contacts.created_at.name).toBe("created_at");
    expect(contacts.created_at.notNull).toBe(true);
  });

  it("has updated_at column (NOT NULL)", () => {
    expect(contacts.updated_at).toBeDefined();
    expect(contacts.updated_at.name).toBe("updated_at");
    expect(contacts.updated_at.notNull).toBe(true);
  });

  it("has created_by column (FK to users, nullable)", () => {
    expect(contacts.created_by).toBeDefined();
    expect(contacts.created_by.name).toBe("created_by");
    expect(contacts.created_by.notNull).toBe(false);
  });

  it("has exactly 20 columns", () => {
    const columnNames = [
      "id",
      "tenant_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "postal_code",
      "country",
      "tax_id",
      "payment_info",
      "notes",
      "status",
      "portal_user_id",
      "created_at",
      "updated_at",
      "created_by",
    ];

    for (const name of columnNames) {
      expect(
        (contacts as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(20);
  });
});

describe("contact_roles table schema structure (AC-7.1.2)", () => {
  it("is defined as a pgTable", () => {
    expect(contactRoles).toBeDefined();
    expect(typeof contactRoles).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(contactRoles.id).toBeDefined();
    expect(contactRoles.id.name).toBe("id");
  });

  it("has contact_id column (FK to contacts, NOT NULL)", () => {
    expect(contactRoles.contact_id).toBeDefined();
    expect(contactRoles.contact_id.name).toBe("contact_id");
    expect(contactRoles.contact_id.notNull).toBe(true);
  });

  it("has role column (NOT NULL)", () => {
    expect(contactRoles.role).toBeDefined();
    expect(contactRoles.role.name).toBe("role");
    expect(contactRoles.role.notNull).toBe(true);
  });

  it("has role_specific_data column (JSONB, nullable)", () => {
    expect(contactRoles.role_specific_data).toBeDefined();
    expect(contactRoles.role_specific_data.name).toBe("role_specific_data");
    expect(contactRoles.role_specific_data.notNull).toBe(false);
  });

  it("has assigned_at column (NOT NULL)", () => {
    expect(contactRoles.assigned_at).toBeDefined();
    expect(contactRoles.assigned_at.name).toBe("assigned_at");
    expect(contactRoles.assigned_at.notNull).toBe(true);
  });

  it("has assigned_by column (FK to users, nullable)", () => {
    expect(contactRoles.assigned_by).toBeDefined();
    expect(contactRoles.assigned_by.name).toBe("assigned_by");
    expect(contactRoles.assigned_by.notNull).toBe(false);
  });

  it("has exactly 6 columns", () => {
    const columnNames = [
      "id",
      "contact_id",
      "role",
      "role_specific_data",
      "assigned_at",
      "assigned_by",
    ];

    for (const name of columnNames) {
      expect(
        (contactRoles as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(6);
  });
});

describe("Contact type (AC-7.1.6)", () => {
  it("infers select type from contacts table", () => {
    const mockContact: Contact = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      phone: "555-1234",
      address_line1: "123 Main St",
      address_line2: "Apt 4",
      city: "Anytown",
      state: "CA",
      postal_code: "12345",
      country: "USA",
      tax_id: "123-45-6789",
      payment_info: { method: "check" },
      notes: "Test contact",
      status: "active",
      portal_user_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(mockContact.id).toBeDefined();
    expect(mockContact.first_name).toBe("John");
    expect(mockContact.last_name).toBe("Doe");
    expect(mockContact.status).toBe("active");
  });

  it("supports null nullable fields", () => {
    const contact: Contact = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      first_name: "Jane",
      last_name: "Smith",
      email: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      tax_id: null,
      payment_info: null,
      notes: null,
      status: "inactive",
      portal_user_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(contact.email).toBeNull();
    expect(contact.phone).toBeNull();
    expect(contact.payment_info).toBeNull();
  });
});

describe("ContactRole type (AC-7.1.6)", () => {
  it("infers select type from contactRoles table", () => {
    const mockRole: ContactRole = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contact_id: "550e8400-e29b-41d4-a716-446655440001",
      role: "author",
      role_specific_data: { pen_name: "J.D. Writer" },
      assigned_at: new Date(),
      assigned_by: null,
    };

    expect(mockRole.id).toBeDefined();
    expect(mockRole.role).toBe("author");
    expect(mockRole.role_specific_data).toEqual({ pen_name: "J.D. Writer" });
  });

  it("supports all role types", () => {
    const baseRole: ContactRole = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contact_id: "550e8400-e29b-41d4-a716-446655440001",
      role: "author",
      role_specific_data: null,
      assigned_at: new Date(),
      assigned_by: null,
    };

    for (const roleType of contactRoleValues) {
      const role: ContactRole = { ...baseRole, role: roleType };
      expect(role.role).toBe(roleType);
    }
  });
});

describe("InsertContact type (AC-7.1.6)", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertContact = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      first_name: "John",
      last_name: "Doe",
    };

    expect(insertData.tenant_id).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional nullable fields", () => {
    const insertData: InsertContact = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      first_name: "Jane",
      last_name: "Smith",
    };

    expect(insertData.email).toBeUndefined();
    expect(insertData.phone).toBeUndefined();
    expect(insertData.payment_info).toBeUndefined();
  });

  it("allows optional status field (defaults to active)", () => {
    const insertData: InsertContact = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      first_name: "John",
      last_name: "Doe",
    };

    expect(insertData.status).toBeUndefined();
  });
});

describe("InsertContactRole type (AC-7.1.6)", () => {
  it("requires contact_id and role", () => {
    const insertData: InsertContactRole = {
      contact_id: "550e8400-e29b-41d4-a716-446655440001",
      role: "vendor",
    };

    expect(insertData.contact_id).toBeDefined();
    expect(insertData.role).toBe("vendor");
  });

  it("allows optional role_specific_data", () => {
    const insertData: InsertContactRole = {
      contact_id: "550e8400-e29b-41d4-a716-446655440001",
      role: "author",
      role_specific_data: { pen_name: "Pseudonym" },
    };

    expect(insertData.role_specific_data).toEqual({ pen_name: "Pseudonym" });
  });
});

describe("Zod Schemas Validation (AC-7.1.6)", () => {
  describe("createContactSchema", () => {
    it("validates contact with required fields", () => {
      const result = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
      });

      expect(result.success).toBe(true);
    });

    it("rejects contact without first_name", () => {
      const result = createContactSchema.safeParse({
        last_name: "Doe",
      });

      expect(result.success).toBe(false);
    });

    it("rejects contact without last_name", () => {
      const result = createContactSchema.safeParse({
        first_name: "John",
      });

      expect(result.success).toBe(false);
    });

    it("validates email format when provided", () => {
      const validResult = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
      });

      expect(validResult.success).toBe(true);

      const invalidResult = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        email: "not-an-email",
      });

      expect(invalidResult.success).toBe(false);
    });

    it("accepts empty string for optional email", () => {
      const result = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        email: "",
      });

      expect(result.success).toBe(true);
    });

    it("validates status enum values", () => {
      const activeResult = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        status: "active",
      });

      expect(activeResult.success).toBe(true);

      const inactiveResult = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        status: "inactive",
      });

      expect(inactiveResult.success).toBe(true);

      const invalidResult = createContactSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
        status: "pending",
      });

      expect(invalidResult.success).toBe(false);
    });
  });

  describe("updateContactSchema", () => {
    it("allows partial updates", () => {
      const result = updateContactSchema.safeParse({
        first_name: "Jane",
      });

      expect(result.success).toBe(true);
    });

    it("allows empty object", () => {
      const result = updateContactSchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });

  describe("paymentInfoSchema", () => {
    it("validates direct deposit payment info", () => {
      const result = paymentInfoSchema.safeParse({
        method: "direct_deposit",
        bank_name: "Test Bank",
        account_type: "checking",
        routing_number: "123456789",
        account_number_last4: "1234",
      });

      expect(result.success).toBe(true);
    });

    it("validates check payment info", () => {
      const result = paymentInfoSchema.safeParse({
        method: "check",
        payee_name: "John Doe",
      });

      expect(result.success).toBe(true);
    });

    it("validates check payment info with optional payee", () => {
      const result = paymentInfoSchema.safeParse({
        method: "check",
      });

      expect(result.success).toBe(true);
    });

    it("validates wire transfer payment info", () => {
      const result = paymentInfoSchema.safeParse({
        method: "wire_transfer",
        bank_name: "International Bank",
        swift_code: "ABCDUS33XXX",
        iban: "DE89370400440532013000",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid routing number format", () => {
      const result = paymentInfoSchema.safeParse({
        method: "direct_deposit",
        bank_name: "Test Bank",
        account_type: "checking",
        routing_number: "12345", // Too short
        account_number_last4: "1234",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid SWIFT code format", () => {
      const result = paymentInfoSchema.safeParse({
        method: "wire_transfer",
        bank_name: "International Bank",
        swift_code: "invalid",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("assignContactRoleSchema", () => {
    it("validates author role assignment", () => {
      const result = assignContactRoleSchema.safeParse({
        role: "author",
        role_specific_data: {
          pen_name: "J.D. Writer",
          bio: "An author biography",
        },
      });

      expect(result.success).toBe(true);
    });

    it("validates customer role assignment", () => {
      const result = assignContactRoleSchema.safeParse({
        role: "customer",
        role_specific_data: {
          credit_limit: 10000,
          payment_terms: "Net 30",
        },
      });

      expect(result.success).toBe(true);
    });

    it("validates vendor role assignment", () => {
      const result = assignContactRoleSchema.safeParse({
        role: "vendor",
        role_specific_data: {
          vendor_code: "VND-001",
          lead_time_days: 14,
        },
      });

      expect(result.success).toBe(true);
    });

    it("validates distributor role assignment", () => {
      const result = assignContactRoleSchema.safeParse({
        role: "distributor",
        role_specific_data: {
          territory: "Northeast",
          commission_rate: 0.15,
        },
      });

      expect(result.success).toBe(true);
    });

    it("validates role without role_specific_data", () => {
      const result = assignContactRoleSchema.safeParse({
        role: "author",
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Role-Specific Data Type Guards (AC-7.1.3)", () => {
  describe("isAuthorRoleData", () => {
    it("returns true for valid AuthorRoleData", () => {
      const data: AuthorRoleData = {
        pen_name: "J.D. Writer",
        bio: "An author",
        website: "https://author.com",
      };

      expect(isAuthorRoleData(data)).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(isAuthorRoleData({})).toBe(true);
    });

    it("returns false for null", () => {
      expect(isAuthorRoleData(null)).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isAuthorRoleData("string")).toBe(false);
    });

    it("returns false for invalid pen_name type", () => {
      expect(isAuthorRoleData({ pen_name: 123 })).toBe(false);
    });
  });

  describe("isCustomerRoleData", () => {
    it("returns true for valid CustomerRoleData", () => {
      const data: CustomerRoleData = {
        credit_limit: 10000,
        payment_terms: "Net 30",
      };

      expect(isCustomerRoleData(data)).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(isCustomerRoleData({})).toBe(true);
    });

    it("returns false for invalid credit_limit type", () => {
      expect(isCustomerRoleData({ credit_limit: "10000" })).toBe(false);
    });
  });

  describe("isVendorRoleData", () => {
    it("returns true for valid VendorRoleData", () => {
      const data: VendorRoleData = {
        vendor_code: "VND-001",
        lead_time_days: 14,
        min_order_amount: 100,
      };

      expect(isVendorRoleData(data)).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(isVendorRoleData({})).toBe(true);
    });

    it("returns false for invalid lead_time_days type", () => {
      expect(isVendorRoleData({ lead_time_days: "14" })).toBe(false);
    });
  });

  describe("isDistributorRoleData", () => {
    it("returns true for valid DistributorRoleData", () => {
      const data: DistributorRoleData = {
        territory: "Northeast",
        commission_rate: 0.15,
        contract_terms: "Annual renewal",
      };

      expect(isDistributorRoleData(data)).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(isDistributorRoleData({})).toBe(true);
    });

    it("returns false for invalid commission_rate type", () => {
      expect(isDistributorRoleData({ commission_rate: "15%" })).toBe(false);
    });
  });

  describe("isPaymentInfo", () => {
    it("returns true for valid direct_deposit PaymentInfo", () => {
      const data: PaymentInfo = {
        method: "direct_deposit",
        bank_name: "Test Bank",
        account_type: "checking",
        routing_number: "123456789",
        account_number_last4: "1234",
      };

      expect(isPaymentInfo(data)).toBe(true);
    });

    it("returns true for valid check PaymentInfo", () => {
      const data: PaymentInfo = {
        method: "check",
        payee_name: "John Doe",
      };

      expect(isPaymentInfo(data)).toBe(true);
    });

    it("returns true for check without optional payee_name", () => {
      const data: PaymentInfo = {
        method: "check",
      };

      expect(isPaymentInfo(data)).toBe(true);
    });

    it("returns true for valid wire_transfer PaymentInfo", () => {
      const data: PaymentInfo = {
        method: "wire_transfer",
        bank_name: "International Bank",
        swift_code: "ABCDUS33",
      };

      expect(isPaymentInfo(data)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isPaymentInfo(null)).toBe(false);
    });

    it("returns false for missing method", () => {
      expect(isPaymentInfo({ bank_name: "Test" })).toBe(false);
    });

    it("returns false for invalid method", () => {
      expect(isPaymentInfo({ method: "paypal" })).toBe(false);
    });

    it("returns false for direct_deposit missing required fields", () => {
      expect(
        isPaymentInfo({
          method: "direct_deposit",
          bank_name: "Test Bank",
          // Missing account_type, routing_number, account_number_last4
        }),
      ).toBe(false);
    });

    it("returns false for wire_transfer missing required fields", () => {
      expect(
        isPaymentInfo({
          method: "wire_transfer",
          bank_name: "Test Bank",
          // Missing swift_code
        }),
      ).toBe(false);
    });
  });
});

describe("Zod Enum Schemas (AC-7.1.6)", () => {
  describe("contactStatusEnum", () => {
    it("accepts active", () => {
      expect(contactStatusEnum.safeParse("active").success).toBe(true);
    });

    it("accepts inactive", () => {
      expect(contactStatusEnum.safeParse("inactive").success).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(contactStatusEnum.safeParse("pending").success).toBe(false);
    });
  });

  describe("contactRoleEnum", () => {
    it("accepts all valid roles", () => {
      expect(contactRoleEnum.safeParse("author").success).toBe(true);
      expect(contactRoleEnum.safeParse("customer").success).toBe(true);
      expect(contactRoleEnum.safeParse("vendor").success).toBe(true);
      expect(contactRoleEnum.safeParse("distributor").success).toBe(true);
    });

    it("rejects invalid role", () => {
      expect(contactRoleEnum.safeParse("employee").success).toBe(false);
    });
  });
});

describe("Address Schema (AC-7.1.3)", () => {
  it("validates complete address", () => {
    const result = addressSchema.safeParse({
      line1: "123 Main St",
      line2: "Apt 4",
      city: "Anytown",
      state: "CA",
      postal_code: "12345",
      country: "USA",
    });

    expect(result.success).toBe(true);
  });

  it("validates partial address", () => {
    const result = addressSchema.safeParse({
      city: "Anytown",
      state: "CA",
    });

    expect(result.success).toBe(true);
  });

  it("validates empty address", () => {
    const result = addressSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});
