"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import type { ActionResult } from "@/lib/types";
import {
  type CreateTenantInput,
  checkSubdomainAvailabilitySchema,
  createTenantSchema,
} from "./schema";
import type { RegistrationResult, SubdomainAvailabilityResult } from "./types";

/**
 * Check if subdomain is available (real-time validation)
 * Debounced 500ms on client side
 */
export async function checkSubdomainAvailability(
  subdomain: string,
): Promise<ActionResult<SubdomainAvailabilityResult>> {
  try {
    // Validate subdomain format
    const validated = checkSubdomainAvailabilitySchema.parse({ subdomain });

    // Query database for existing tenant with this subdomain
    const existing = await adminDb.query.tenants.findFirst({
      where: eq(tenants.subdomain, validated.subdomain),
    });

    if (existing) {
      return {
        success: true,
        data: {
          available: false,
          message: "This subdomain is already taken. Try another.",
        },
      };
    }

    return {
      success: true,
      data: {
        available: true,
      },
    };
  } catch (error) {
    console.error("Subdomain availability check failed", error);
    return {
      success: false,
      error: "Unable to check subdomain availability. Please try again.",
    };
  }
}

/**
 * Register new tenant with owner user
 * Transaction pattern: Create Clerk user → Create tenant → Create user record
 * Rollback: If DB fails, delete Clerk user
 */
export async function registerTenant(
  input: CreateTenantInput,
): Promise<ActionResult<RegistrationResult>> {
  let clerkUserId: string | undefined;

  try {
    // 1. Validate inputs
    const validated = createTenantSchema.parse(input);

    // 2. Check subdomain uniqueness
    const existing = await adminDb.query.tenants.findFirst({
      where: eq(tenants.subdomain, validated.subdomain),
    });

    if (existing) {
      return {
        success: false,
        error: "This subdomain is already taken. Try another.",
      };
    }

    // 3. Create Clerk user account
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.createUser({
      emailAddress: [validated.ownerEmail],
      password: validated.password,
      firstName: validated.ownerName.split(" ")[0],
      lastName: validated.ownerName.split(" ").slice(1).join(" ") || undefined,
    });

    clerkUserId = clerkUser.id;

    // 4. Create tenant record
    const [tenant] = await adminDb
      .insert(tenants)
      .values({
        subdomain: validated.subdomain,
        name: validated.companyName,
        timezone: "America/New_York",
        default_currency: "USD",
        statement_frequency: "quarterly",
      })
      .returning();

    // 5. Create user record linked to tenant
    const [user] = await adminDb
      .insert(users)
      .values({
        tenant_id: tenant.id,
        clerk_user_id: clerkUser.id,
        email: validated.ownerEmail,
        role: "owner",
        is_active: true,
      })
      .returning();

    // 6. Update Clerk user metadata with tenant info
    await clerk.users.updateUser(clerkUser.id, {
      publicMetadata: {
        tenant_id: tenant.id,
        subdomain: tenant.subdomain,
        role: "owner",
      },
    });

    console.info("Tenant registered successfully", {
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      userId: user.id,
    });

    return {
      success: true,
      data: {
        tenantId: tenant.id,
        userId: user.id,
        subdomain: tenant.subdomain,
      },
    };
  } catch (error) {
    // Cleanup: If Clerk user created but DB failed, delete Clerk user
    if (clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(clerkUserId);
        console.warn("Rolled back Clerk user after DB failure", {
          clerkUserId,
        });
      } catch (cleanupError) {
        console.error("Failed to cleanup Clerk user", {
          clerkUserId,
          cleanupError,
        });
      }
    }

    console.error("Tenant registration failed", { error, input });

    // Check if Clerk-specific error
    if (error && typeof error === "object" && "errors" in error) {
      const clerkError = error as { errors?: Array<{ message: string }> };
      if (clerkError.errors && clerkError.errors.length > 0) {
        return {
          success: false,
          error: `Unable to create account: ${clerkError.errors[0].message}`,
        };
      }
    }

    return {
      success: false,
      error:
        "Unable to complete registration. Please try again or contact support.",
    };
  }
}
