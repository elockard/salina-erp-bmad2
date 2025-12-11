/**
 * Contact Actions Unit Tests
 *
 * Story 7.2: Build Contact Management Interface
 * Tests for server actions: createContact, updateContact, deactivateContact,
 * reactivateContact, assignContactRole, removeContactRole, updateContactRoleData
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing actions
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import {
  assignContactRole,
  createContact,
  deactivateContact,
  reactivateContact,
  removeContactRole,
  updateContact,
  updateContactRoleData,
} from "@/modules/contacts/actions";

// Type the mocks
const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockGetCurrentTenantId = getCurrentTenantId as ReturnType<typeof vi.fn>;
const mockGetDb = getDb as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as ReturnType<typeof vi.fn>;
const mockLogAuditEvent = logAuditEvent as ReturnType<typeof vi.fn>;

describe("Contact Actions", () => {
  const mockUser = {
    id: "user-1",
    tenant_id: "tenant-1",
    role: "admin",
  };

  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
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
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentTenantId.mockResolvedValue("tenant-1");
    mockGetDb.mockResolvedValue(mockDb);
    mockRequirePermission.mockResolvedValue(mockUser);
  });

  describe("createContact", () => {
    it("should create a contact with valid data", async () => {
      const mockContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        status: "active",
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockContact]),
        }),
      });

      const result = await createContact({
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe("John");
      }
      expect(mockRequirePermission).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalled();
    });

    it("should return error for missing required fields", async () => {
      const result = await createContact({
        first_name: "",
        last_name: "Doe",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("First name is required");
      }
    });

    it("should return error when user lacks permission", async () => {
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await createContact({
        first_name: "John",
        last_name: "Doe",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should handle duplicate email error", async () => {
      const pgError = new Error("duplicate key");
      (pgError as Error & { code: string }).code = "23505";

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(pgError),
        }),
      });

      const result = await createContact({
        first_name: "John",
        last_name: "Doe",
        email: "existing@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("email already exists");
      }
    });

    it("should create contact with roles", async () => {
      const mockContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        first_name: "John",
        last_name: "Doe",
        status: "active",
      };

      const mockRole = {
        id: "role-1",
        contact_id: "contact-1",
        role: "author",
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValueOnce([mockContact])
            .mockResolvedValueOnce([mockRole]),
        }),
      });

      const result = await createContact(
        { first_name: "John", last_name: "Doe" },
        [{ role: "author" }],
      );

      expect(result.success).toBe(true);
    });
  });

  describe("updateContact", () => {
    it("should update contact with valid data", async () => {
      const existingContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        first_name: "John",
        last_name: "Doe",
        roles: [],
      };

      const updatedContact = {
        ...existingContact,
        first_name: "Jane",
      };

      mockDb.query.contacts.findFirst
        .mockResolvedValueOnce(existingContact)
        .mockResolvedValueOnce(updatedContact);

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedContact]),
          }),
        }),
      });

      const result = await updateContact("contact-1", { first_name: "Jane" });

      expect(result.success).toBe(true);
      expect(mockLogAuditEvent).toHaveBeenCalled();
    });

    it("should return error for non-existent contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await updateContact("non-existent", {
        first_name: "Jane",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("deactivateContact", () => {
    it("should deactivate an active contact", async () => {
      const existingContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        status: "active",
      };

      const deactivatedContact = {
        ...existingContact,
        status: "inactive",
        roles: [],
      };

      mockDb.query.contacts.findFirst
        .mockResolvedValueOnce(existingContact)
        .mockResolvedValueOnce(deactivatedContact);

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await deactivateContact("contact-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("inactive");
      }
      expect(mockLogAuditEvent).toHaveBeenCalled();
    });

    it("should require MANAGE_USERS permission", async () => {
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await deactivateContact("contact-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });
  });

  describe("reactivateContact", () => {
    it("should reactivate an inactive contact", async () => {
      const reactivatedContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        status: "active",
        roles: [],
      };

      mockDb.query.contacts.findFirst.mockResolvedValue(reactivatedContact);

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await reactivateContact("contact-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("active");
      }
    });
  });

  describe("assignContactRole", () => {
    it("should assign a role to contact", async () => {
      const mockContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        roles: [{ id: "role-1", role: "author" }],
      };

      mockDb.query.contacts.findFirst.mockResolvedValue(mockContact);

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: "role-1", role: "author" }]),
        }),
      });

      const result = await assignContactRole("contact-1", { role: "author" });

      expect(result.success).toBe(true);
    });

    it("should require ASSIGN_CUSTOMER_ROLE permission for customer role", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue({
        id: "contact-1",
        tenant_id: "tenant-1",
      });

      // First call for MANAGE_CONTACTS passes, second for ASSIGN_CUSTOMER_ROLE fails
      mockRequirePermission
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error("UNAUTHORIZED"));

      const result = await assignContactRole("contact-1", { role: "customer" });

      expect(result.success).toBe(false);
    });

    it("should handle duplicate role assignment", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue({
        id: "contact-1",
        tenant_id: "tenant-1",
      });

      const pgError = new Error("duplicate key");
      (pgError as Error & { code: string }).code = "23505";

      // The insert().values() chain should reject with duplicate key error
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(pgError),
      });

      const result = await assignContactRole("contact-1", { role: "author" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already assigned");
      }
    });
  });

  describe("removeContactRole", () => {
    it("should remove a role from contact", async () => {
      const mockContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        roles: [],
      };

      mockDb.query.contacts.findFirst.mockResolvedValue(mockContact);

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await removeContactRole("contact-1", "author");

      expect(result.success).toBe(true);
    });

    it("should return error for non-existent contact", async () => {
      mockDb.query.contacts.findFirst.mockResolvedValue(null);

      const result = await removeContactRole("non-existent", "author");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("updateContactRoleData", () => {
    it("should update role-specific data", async () => {
      const mockContact = {
        id: "contact-1",
        tenant_id: "tenant-1",
        roles: [
          {
            id: "role-1",
            role: "author",
            role_specific_data: { pen_name: "Updated" },
          },
        ],
      };

      mockDb.query.contacts.findFirst.mockResolvedValue(mockContact);

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await updateContactRoleData("contact-1", "author", {
        pen_name: "Updated Pen Name",
      });

      expect(result.success).toBe(true);
    });
  });
});
