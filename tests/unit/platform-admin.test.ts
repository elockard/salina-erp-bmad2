/**
 * Platform Admin Unit Tests
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * Tests for isPlatformAdmin() and getCurrentPlatformAdmin() functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Clerk's currentUser
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock platform-audit to prevent actual DB calls
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
}));

describe("isPlatformAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true for whitelisted emails", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com,ops@example.com";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("admin@example.com")).toBe(true);
    expect(isPlatformAdmin("ops@example.com")).toBe(true);
  });

  it("returns false for non-whitelisted emails", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("user@example.com")).toBe(false);
    expect(isPlatformAdmin("hacker@evil.com")).toBe(false);
  });

  it("performs case-insensitive email matching", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "Admin@Example.COM,OPS@EXAMPLE.com";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("admin@example.com")).toBe(true);
    expect(isPlatformAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
    expect(isPlatformAdmin("ops@example.com")).toBe(true);
    expect(isPlatformAdmin("Ops@Example.Com")).toBe(true);
  });

  it("returns false for all emails when whitelist is empty", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("admin@example.com")).toBe(false);
    expect(isPlatformAdmin("anyone@anywhere.com")).toBe(false);
  });

  it("returns false when PLATFORM_ADMIN_EMAILS is not set", async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("admin@example.com")).toBe(false);
  });

  it("handles whitespace in email list correctly", async () => {
    process.env.PLATFORM_ADMIN_EMAILS =
      "  admin@example.com  ,  ops@example.com  ";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("admin@example.com")).toBe(true);
    expect(isPlatformAdmin("ops@example.com")).toBe(true);
  });

  it("handles single email in whitelist", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "solo-admin@example.com";
    const { isPlatformAdmin } = await import("@/lib/platform-admin");

    expect(isPlatformAdmin("solo-admin@example.com")).toBe(true);
    expect(isPlatformAdmin("other@example.com")).toBe(false);
  });
});

describe("getCurrentPlatformAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when user is not authenticated", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    const { currentUser } = await import("@clerk/nextjs/server");
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { getCurrentPlatformAdmin } = await import("@/lib/platform-admin");
    const result = await getCurrentPlatformAdmin();

    expect(result).toBeNull();
  });

  it("returns null when user email is not in whitelist", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    const { currentUser } = await import("@clerk/nextjs/server");
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_123",
      primaryEmailAddress: { emailAddress: "nonadmin@example.com" },
      firstName: "John",
      lastName: "Doe",
    });

    const { getCurrentPlatformAdmin } = await import("@/lib/platform-admin");
    const result = await getCurrentPlatformAdmin();

    expect(result).toBeNull();
  });

  it("returns admin info when user is a platform admin", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    const { currentUser } = await import("@clerk/nextjs/server");
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_admin_456",
      primaryEmailAddress: { emailAddress: "admin@example.com" },
      firstName: "Alice",
      lastName: "Admin",
    });

    const { getCurrentPlatformAdmin } = await import("@/lib/platform-admin");
    const result = await getCurrentPlatformAdmin();

    expect(result).toEqual({
      clerkId: "user_admin_456",
      email: "admin@example.com",
      name: "Alice Admin",
    });
  });

  it("returns email as name when firstName is not set", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    const { currentUser } = await import("@clerk/nextjs/server");
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_admin_789",
      primaryEmailAddress: { emailAddress: "admin@example.com" },
      firstName: null,
      lastName: null,
    });

    const { getCurrentPlatformAdmin } = await import("@/lib/platform-admin");
    const result = await getCurrentPlatformAdmin();

    expect(result).toEqual({
      clerkId: "user_admin_789",
      email: "admin@example.com",
      name: "admin@example.com",
    });
  });

  it("returns null when user has no primary email", async () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    const { currentUser } = await import("@clerk/nextjs/server");
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_noemail",
      primaryEmailAddress: null,
      firstName: "No",
      lastName: "Email",
    });

    const { getCurrentPlatformAdmin } = await import("@/lib/platform-admin");
    const result = await getCurrentPlatformAdmin();

    expect(result).toBeNull();
  });
});
