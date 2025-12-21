"use server";

/**
 * Author Notifications Server Actions
 *
 * Story 21.4 - FR185: Production Milestone Notifications
 *
 * Server actions for updating author milestone notification preferences.
 * Uses portal auth pattern - authors are identified by contact linked to portal user.
 */

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorNotificationPreferences } from "@/db/schema/author-notification-preferences";
import { contacts } from "@/db/schema/contacts";
import { getCurrentUser, getDb } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { getAuthorMilestonePreferences } from "./queries";
import type { AuthorMilestonePreferences } from "./types";

/**
 * Schema for milestone preferences update.
 */
const updateMilestonePreferencesSchema = z.object({
  notifyEditing: z.boolean().optional(),
  notifyDesign: z.boolean().optional(),
  notifyProof: z.boolean().optional(),
  notifyPrintReady: z.boolean().optional(),
  notifyComplete: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

export type UpdateMilestonePreferencesInput = z.infer<
  typeof updateMilestonePreferencesSchema
>;

/**
 * Fetch current author milestone preferences.
 * AC 21.4.3: Author can access notification preferences in portal.
 */
export async function fetchAuthorMilestonePreferences(): Promise<
  ActionResult<{ preferences: AuthorMilestonePreferences }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "author") {
      return {
        success: false,
        error: "Not authorized",
      };
    }

    const db = await getDb();

    // Get contact linked to this portal user
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.portal_user_id, user.id),
        eq(contacts.status, "active"),
      ),
    });

    if (!contact) {
      return {
        success: false,
        error: "Author contact not found",
      };
    }

    // Get preferences (with defaults applied)
    const prefs = await getAuthorMilestonePreferences(
      contact.id,
      user.tenant_id,
    );

    // Return preferences or defaults
    const preferences: AuthorMilestonePreferences = prefs ?? {
      contactId: contact.id,
      tenantId: user.tenant_id,
      notifyEditing: true,
      notifyDesign: true,
      notifyProof: true,
      notifyPrintReady: true,
      notifyComplete: true,
      emailEnabled: true,
    };

    return {
      success: true,
      data: { preferences },
    };
  } catch (error) {
    console.error("fetchAuthorMilestonePreferences error:", error);
    return {
      success: false,
      error: "Failed to fetch preferences",
    };
  }
}

/**
 * Update author milestone notification preferences.
 * AC 21.4.3: Author can configure which stages trigger notifications.
 * AC 21.4.6: Disabled stages don't receive notifications.
 */
export async function updateMilestonePreferences(
  input: UpdateMilestonePreferencesInput,
): Promise<ActionResult<{ success: boolean }>> {
  try {
    // Validate input
    const validated = updateMilestonePreferencesSchema.parse(input);

    const user = await getCurrentUser();
    if (!user || user.role !== "author") {
      return {
        success: false,
        error: "Not authorized",
      };
    }

    const db = await getDb();

    // Get contact linked to this portal user
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.portal_user_id, user.id),
        eq(contacts.status, "active"),
      ),
    });

    if (!contact) {
      return {
        success: false,
        error: "Author contact not found",
      };
    }

    // Upsert preferences
    await db
      .insert(authorNotificationPreferences)
      .values({
        tenantId: user.tenant_id,
        contactId: contact.id,
        notifyEditing: validated.notifyEditing,
        notifyDesign: validated.notifyDesign,
        notifyProof: validated.notifyProof,
        notifyPrintReady: validated.notifyPrintReady,
        notifyComplete: validated.notifyComplete,
        emailEnabled: validated.emailEnabled,
      })
      .onConflictDoUpdate({
        target: [
          authorNotificationPreferences.tenantId,
          authorNotificationPreferences.contactId,
        ],
        set: {
          ...(validated.notifyEditing !== undefined && {
            notifyEditing: validated.notifyEditing,
          }),
          ...(validated.notifyDesign !== undefined && {
            notifyDesign: validated.notifyDesign,
          }),
          ...(validated.notifyProof !== undefined && {
            notifyProof: validated.notifyProof,
          }),
          ...(validated.notifyPrintReady !== undefined && {
            notifyPrintReady: validated.notifyPrintReady,
          }),
          ...(validated.notifyComplete !== undefined && {
            notifyComplete: validated.notifyComplete,
          }),
          ...(validated.emailEnabled !== undefined && {
            emailEnabled: validated.emailEnabled,
          }),
          updatedAt: new Date(),
        },
      });

    revalidatePath("/portal/settings/notifications");

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("updateMilestonePreferences error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return {
      success: false,
      error: "Failed to update preferences",
    };
  }
}
