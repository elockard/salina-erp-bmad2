"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { encryptTIN } from "@/lib/encryption";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import { extractLastFour } from "@/lib/tin-validation";
import type { ActionResult } from "@/lib/types";
import {
  type CreateTenantInput,
  checkSubdomainAvailabilitySchema,
  createTenantSchema,
  type UpdatePayerInfoFormInput,
  type UpdateTenantSettingsFormInput,
  updatePayerInfoFormSchema,
  updateTenantSettingsFormSchema,
} from "./schema";
import type {
  PayerInfo,
  RegistrationResult,
  SubdomainAvailabilityResult,
  TenantSettings,
} from "./types";

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

// ============================================
// Tenant Settings Server Actions (Story 1.7)
// ============================================

/**
 * Get current tenant settings
 * Permission: MANAGE_SETTINGS (Owner, Admin)
 *
 * AC 2: Settings page loads current tenant settings from database
 * AC 7: Fields pre-populated with current values on page load
 */
export async function getTenantSettings(): Promise<
  ActionResult<TenantSettings>
> {
  try {
    // Check permission
    await requirePermission(MANAGE_SETTINGS);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Query tenant record
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return {
        success: false,
        error: "Tenant not found",
      };
    }

    // fiscal_year_start is already a string (YYYY-MM-DD) from Drizzle date() type
    const settings: TenantSettings = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      timezone: tenant.timezone,
      fiscal_year_start: tenant.fiscal_year_start,
      default_currency: tenant.default_currency,
      statement_frequency: tenant.statement_frequency,
      // Royalty period settings (Story 7.5)
      royalty_period_type:
        tenant.royalty_period_type as TenantSettings["royalty_period_type"],
      royalty_period_start_month: tenant.royalty_period_start_month,
      royalty_period_start_day: tenant.royalty_period_start_day,
      // Payer info (Story 11.3)
      payer_ein_last_four: tenant.payer_ein_last_four,
      payer_name: tenant.payer_name,
      payer_address_line1: tenant.payer_address_line1,
      payer_address_line2: tenant.payer_address_line2,
      payer_city: tenant.payer_city,
      payer_state: tenant.payer_state,
      payer_zip: tenant.payer_zip,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };

    return { success: true, data: settings };
  } catch (error) {
    // AC 14: Permission denied error handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view tenant settings",
      };
    }

    console.error("getTenantSettings error:", error);
    return {
      success: false,
      error: "Failed to load settings. Please try again.",
    };
  }
}

/**
 * Update tenant settings
 * Permission: MANAGE_SETTINGS (Owner, Admin)
 *
 * AC 13: Server Action updateTenantSettings checks permission MANAGE_SETTINGS before update
 * AC 15: Server-side validation using Zod schema
 * AC 16: On success, update tenant record with new values
 * AC 17: Update updated_at timestamp on every successful save
 */
export async function updateTenantSettings(
  data: UpdateTenantSettingsFormInput,
): Promise<ActionResult<TenantSettings>> {
  try {
    // AC 13: Check permission
    await requirePermission(MANAGE_SETTINGS);

    // AC 15: Validate input with Zod
    const validated = updateTenantSettingsFormSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // AC 16 & 17: Update tenant record with updated_at
    // fiscal_year_start is stored as string (YYYY-MM-DD) via Drizzle date() type
    const [updated] = await db
      .update(tenants)
      .set({
        timezone: validated.timezone,
        fiscal_year_start: validated.fiscal_year_start || null,
        default_currency: validated.default_currency,
        statement_frequency: validated.statement_frequency,
        // Royalty period settings (Story 7.5)
        royalty_period_type: validated.royalty_period_type,
        royalty_period_start_month: validated.royalty_period_start_month,
        royalty_period_start_day: validated.royalty_period_start_day,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Tenant not found",
      };
    }

    // Convert response to TenantSettings format
    // fiscal_year_start is already a string (YYYY-MM-DD) from Drizzle date() type
    const settings: TenantSettings = {
      id: updated.id,
      name: updated.name,
      subdomain: updated.subdomain,
      timezone: updated.timezone,
      fiscal_year_start: updated.fiscal_year_start,
      default_currency: updated.default_currency,
      statement_frequency: updated.statement_frequency,
      // Royalty period settings (Story 7.5)
      royalty_period_type:
        updated.royalty_period_type as TenantSettings["royalty_period_type"],
      royalty_period_start_month: updated.royalty_period_start_month,
      royalty_period_start_day: updated.royalty_period_start_day,
      // Payer info (Story 11.3)
      payer_ein_last_four: updated.payer_ein_last_four,
      payer_name: updated.payer_name,
      payer_address_line1: updated.payer_address_line1,
      payer_address_line2: updated.payer_address_line2,
      payer_city: updated.payer_city,
      payer_state: updated.payer_state,
      payer_zip: updated.payer_zip,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };

    return { success: true, data: settings };
  } catch (error) {
    // AC 14: Permission denied error handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update tenant settings",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updateTenantSettings error:", error);
    return {
      success: false,
      error: "Failed to save settings. Please try again.",
    };
  }
}

// ============================================
// Payer Information Server Actions (Story 11.3)
// ============================================

/**
 * Get current tenant's payer information for 1099 generation
 * Permission: MANAGE_SETTINGS (Owner, Admin)
 *
 * Story 11.3 - AC-11.3.3: Payer Information for 1099 Generation
 */
export async function getPayerInfo(): Promise<ActionResult<PayerInfo>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Determine if payer info is complete
    const hasPayerInfo = !!(
      tenant.payer_ein_encrypted &&
      tenant.payer_name &&
      tenant.payer_address_line1 &&
      tenant.payer_city &&
      tenant.payer_state &&
      tenant.payer_zip
    );

    const payerInfo: PayerInfo = {
      payer_ein_last_four: tenant.payer_ein_last_four,
      payer_name: tenant.payer_name,
      payer_address_line1: tenant.payer_address_line1,
      payer_address_line2: tenant.payer_address_line2,
      payer_city: tenant.payer_city,
      payer_state: tenant.payer_state,
      payer_zip: tenant.payer_zip,
      has_payer_info: hasPayerInfo,
    };

    return { success: true, data: payerInfo };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view payer information",
      };
    }

    console.error("getPayerInfo error:", error);
    return {
      success: false,
      error: "Failed to load payer information. Please try again.",
    };
  }
}

/**
 * Update tenant's payer information for 1099 generation
 * Permission: MANAGE_SETTINGS (Owner, Admin)
 *
 * Story 11.3 - AC-11.3.3: Payer Information for 1099 Generation
 * - Encrypts EIN before storage
 * - Extracts last 4 digits for display
 */
export async function updatePayerInfo(
  data: UpdatePayerInfoFormInput,
): Promise<ActionResult<PayerInfo>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    // Validate input
    const validated = updatePayerInfoFormSchema.parse(data);

    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Encrypt EIN and extract last 4 digits
    const encryptedEin = encryptTIN(validated.payer_ein);
    const einLastFour = extractLastFour(validated.payer_ein);

    // Update tenant record
    const [updated] = await db
      .update(tenants)
      .set({
        payer_ein_encrypted: encryptedEin,
        payer_ein_last_four: einLastFour,
        payer_name: validated.payer_name,
        payer_address_line1: validated.payer_address_line1,
        payer_address_line2: validated.payer_address_line2 || null,
        payer_city: validated.payer_city,
        payer_state: validated.payer_state,
        payer_zip: validated.payer_zip,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!updated) {
      return { success: false, error: "Tenant not found" };
    }

    // Return updated payer info (never return encrypted EIN)
    const payerInfo: PayerInfo = {
      payer_ein_last_four: updated.payer_ein_last_four,
      payer_name: updated.payer_name,
      payer_address_line1: updated.payer_address_line1,
      payer_address_line2: updated.payer_address_line2,
      payer_city: updated.payer_city,
      payer_state: updated.payer_state,
      payer_zip: updated.payer_zip,
      has_payer_info: true,
    };

    return { success: true, data: payerInfo };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update payer information",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updatePayerInfo error:", error);
    return {
      success: false,
      error: "Failed to save payer information. Please try again.",
    };
  }
}
