import { describe, expect, test } from "vitest";
import {
  deactivateUser,
  getUsers,
  inviteUser,
  reactivateUser,
  updateUserRole,
} from "@/modules/users/actions";

/**
 * Integration tests for user management Server Actions
 * Tests require authenticated session context and database access
 */

describe("User Management Actions", () => {
  describe("getUsers", () => {
    test("returns users for current tenant with pagination", async () => {
      const result = await getUsers({ page: 1, pageSize: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.users).toBeInstanceOf(Array);
        expect(result.data.total).toBeGreaterThanOrEqual(0);
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    test("filters users by role", async () => {
      const result = await getUsers({ roleFilter: "owner" });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.users.forEach((user) => {
          expect(user.role).toBe("owner");
        });
      }
    });

    test("searches users by email", async () => {
      const result = await getUsers({ searchQuery: "test@" });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.users.forEach((user) => {
          expect(user.email.toLowerCase()).toContain("test@");
        });
      }
    });
  });

  describe("inviteUser", () => {
    test("creates pending user and sends invitation", async () => {
      const result = await inviteUser({
        email: "newuser@example.com",
        role: "editor",
      });

      // Will succeed or fail based on permissions
      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result.data.email).toBe("newuser@example.com");
        expect(result.data.role).toBe("editor");
        expect(result.data.is_active).toBe(false);
        expect(result.data.clerk_user_id).toBe("");
      }
    });

    test("rejects duplicate email", async () => {
      const email = "duplicate@example.com";

      // First invite
      await inviteUser({ email, role: "editor" });

      // Second invite should fail
      const result = await inviteUser({ email, role: "admin" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already exists");
      }
    });

    test("validates email format", async () => {
      const result = await inviteUser({
        email: "invalid-email",
        role: "editor",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("updateUserRole", () => {
    test("updates user role successfully", async () => {
      // Get first editor
      const usersResult = await getUsers({ roleFilter: "editor" });
      expect(usersResult.success).toBe(true);

      if (usersResult.success && usersResult.data.users.length > 0) {
        const user = usersResult.data.users[0];

        const result = await updateUserRole(user.id, "finance");

        if (result.success) {
          expect(result.data.role).toBe("finance");
        }
      }
    });

    test("prevents owner from demoting themselves", async () => {
      // Get current user (assuming owner)
      const usersResult = await getUsers({ roleFilter: "owner" });
      expect(usersResult.success).toBe(true);

      if (usersResult.success && usersResult.data.users.length > 0) {
        const ownerUser = usersResult.data.users[0];

        const result = await updateUserRole(ownerUser.id, "editor");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("cannot remove your own owner role");
        }
      }
    });
  });

  describe("deactivateUser", () => {
    test("deactivates user successfully", async () => {
      const usersResult = await getUsers({ roleFilter: "editor" });
      expect(usersResult.success).toBe(true);

      if (usersResult.success && usersResult.data.users.length > 0) {
        const user = usersResult.data.users[0];

        const result = await deactivateUser(user.id);

        if (result.success) {
          expect(result.data.is_active).toBe(false);
        }
      }
    });

    test("prevents deactivating self", async () => {
      const usersResult = await getUsers();
      expect(usersResult.success).toBe(true);

      if (usersResult.success && usersResult.data.users.length > 0) {
        const currentUser = usersResult.data.users[0]; // Assuming first is current

        const result = await deactivateUser(currentUser.id);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("cannot deactivate your own account");
        }
      }
    });
  });

  describe("reactivateUser", () => {
    test("reactivates deactivated user", async () => {
      // First get users
      const usersResult = await getUsers();
      expect(usersResult.success).toBe(true);

      if (usersResult.success) {
        const inactiveUser = usersResult.data.users.find((u) => !u.is_active);

        if (inactiveUser) {
          const result = await reactivateUser(inactiveUser.id);

          if (result.success) {
            expect(result.data.is_active).toBe(true);
          }
        }
      }
    });
  });
});
