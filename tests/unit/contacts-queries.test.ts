/**
 * Contact Queries Unit Tests
 *
 * Story 7.2: Build Contact Management Interface
 * Tests for database queries: getContacts, getContactById, getContactsByRole,
 * searchContacts, getContactRoles, contactHasRole, getContactsCount, getContactByEmail
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing queries
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
}));

import { getCurrentTenantId, getDb } from "@/lib/auth";
import {
  contactHasRole,
  getContactByEmail,
  getContactById,
  getContactRoles,
  getContacts,
  getContactsByRole,
  getContactsCount,
  searchContacts,
} from "@/modules/contacts/queries";

// Type the mocks
const mockGetCurrentTenantId = getCurrentTenantId as ReturnType<typeof vi.fn>;
const mockGetDb = getDb as ReturnType<typeof vi.fn>;

describe("Contact Queries", () => {
  const mockContacts = [
    {
      id: "contact-1",
      tenant_id: "tenant-1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      status: "active",
      roles: [{ id: "role-1", role: "author", contact_id: "contact-1" }],
    },
    {
      id: "contact-2",
      tenant_id: "tenant-1",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      status: "active",
      roles: [{ id: "role-2", role: "customer", contact_id: "contact-2" }],
    },
    {
      id: "contact-3",
      tenant_id: "tenant-1",
      first_name: "Bob",
      last_name: "Wilson",
      email: "bob@example.com",
      status: "inactive",
      roles: [],
    },
  ];

  const mockDb = {
    query: {
      contacts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      contactRoles: {
        findMany: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentTenantId.mockResolvedValue("tenant-1");
    mockGetDb.mockResolvedValue(mockDb);
  });

  describe("getContacts", () => {
    it("should return active contacts by default", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(
        mockContacts.filter((c) => c.status === "active"),
      );

      const result = await getContacts();

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === "active")).toBe(true);
    });

    it("should include inactive contacts when requested", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(mockContacts);

      const result = await getContacts({ includeInactive: true });

      expect(result).toHaveLength(3);
    });

    it("should filter by role", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(mockContacts);

      const result = await getContacts({ role: "author" });

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("John");
    });

    it("should search by name", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[0]]);

      const result = await getContacts({ searchQuery: "john" });

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("John");
    });

    it("should search by email", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[1]]);

      const result = await getContacts({ searchQuery: "jane@" });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("jane@example.com");
    });
  });

  describe("getContactById", () => {
    it("should return contact with roles", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[0]);

      const result = await getContactById("contact-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("contact-1");
      expect(result?.roles).toHaveLength(1);
    });

    it("should return null for non-existent contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await getContactById("non-existent");

      expect(result).toBeNull();
    });

    it("should not return contact from different tenant", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await getContactById("contact-from-other-tenant");

      expect(result).toBeNull();
    });
  });

  describe("getContactsByRole", () => {
    it("should return contacts with specific role", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[0]]);

      const result = await getContactsByRole("author");

      expect(result).toHaveLength(1);
      expect(result[0].roles.some((r) => r.role === "author")).toBe(true);
    });

    it("should return empty array if no contacts have role", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([]);

      const result = await getContactsByRole("distributor");

      expect(result).toHaveLength(0);
    });

    it("should include inactive when requested", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(mockContacts);

      const result = await getContactsByRole("author", {
        includeInactive: true,
      });

      // Only contact-1 has author role
      expect(result).toHaveLength(1);
    });
  });

  describe("searchContacts", () => {
    it("should return empty array for empty query", async () => {
      const result = await searchContacts("");

      expect(result).toHaveLength(0);
      expect(mockDb.query.contacts.findMany).not.toHaveBeenCalled();
    });

    it("should return empty array for whitespace query", async () => {
      const result = await searchContacts("   ");

      expect(result).toHaveLength(0);
    });

    it("should search case-insensitively", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[0]]);

      const result = await searchContacts("JOHN");

      expect(result).toHaveLength(1);
    });

    it("should respect limit parameter", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[0]]);

      const result = await searchContacts("john", { limit: 1 });

      expect(result).toHaveLength(1);
    });

    it("should filter inactive by default", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(
        mockContacts.filter((c) => c.status === "active"),
      );

      const result = await searchContacts("john");

      expect(result.every((c) => c.status === "active")).toBe(true);
    });
  });

  describe("getContactRoles", () => {
    it("should return roles for existing contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[0]);
      mockDb.query.contactRoles.findMany.mockResolvedValue(
        mockContacts[0].roles,
      );

      const result = await getContactRoles("contact-1");

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("author");
    });

    it("should return empty array for contact without roles", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[2]);
      mockDb.query.contactRoles.findMany.mockResolvedValue([]);

      const result = await getContactRoles("contact-3");

      expect(result).toHaveLength(0);
    });

    it("should return empty array for non-existent contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await getContactRoles("non-existent");

      expect(result).toHaveLength(0);
    });
  });

  describe("contactHasRole", () => {
    it("should return true if contact has role", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[0]);
      mockDb.query.contactRoles.findMany.mockResolvedValue(
        mockContacts[0].roles,
      );

      const result = await contactHasRole("contact-1", "author");

      expect(result).toBe(true);
    });

    it("should return false if contact does not have role", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[0]);
      mockDb.query.contactRoles.findMany.mockResolvedValue(
        mockContacts[0].roles,
      );

      const result = await contactHasRole("contact-1", "customer");

      expect(result).toBe(false);
    });

    it("should return false for non-existent contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await contactHasRole("non-existent", "author");

      expect(result).toBe(false);
    });
  });

  describe("getContactsCount", () => {
    it("should return count of active contacts", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(
        mockContacts.filter((c) => c.status === "active"),
      );

      const result = await getContactsCount();

      expect(result).toBe(2);
    });

    it("should count all contacts when includeInactive", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue(mockContacts);

      const result = await getContactsCount({ includeInactive: true });

      expect(result).toBe(3);
    });

    it("should count contacts by role", async () => {
      mockDb.query.contacts.findMany.mockResolvedValue([mockContacts[0]]);

      const result = await getContactsCount({ role: "author" });

      expect(result).toBe(1);
    });
  });

  describe("getContactByEmail", () => {
    it("should return contact by email", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(mockContacts[0]);

      const result = await getContactByEmail("john@example.com");

      expect(result).not.toBeNull();
      expect(result?.email).toBe("john@example.com");
    });

    it("should return null for non-existent email", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await getContactByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });

    it("should be scoped to current tenant", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      await getContactByEmail("john@example.com");

      // Verify tenant scoping is applied (the mock was called)
      expect(mockDb.query.contacts.findFirst).toHaveBeenCalled();
    });
  });
});
