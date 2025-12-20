/**
 * Onboarding module Zod schemas
 * Story 20.1: Build Onboarding Wizard
 */

import { z } from "zod";

/**
 * Step 1: Company profile schema
 * AC 20.1.3: Company Profile Setup
 * Reuses patterns from updateTenantSettingsFormSchema
 */
export const companyProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  fiscalYearStart: z.string().nullable(),
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().min(1, "Timezone is required"),
  statementFrequency: z.enum(["quarterly", "annual"]),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

/**
 * Step 2: Invite team schema
 * AC 20.1.4: Invite Team Member
 * Reuses patterns from inviteUserSchema
 */
export const inviteTeamSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  role: z.enum(["admin", "editor", "finance"], {
    message: "Role is required",
  }),
});

export type InviteTeamInput = z.infer<typeof inviteTeamSchema>;

/**
 * Step 3: Add contact schema
 * AC 20.1.5: Add First Contact
 * Simplified from createContactFormSchema
 */
export const addContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  roles: z.array(z.string()).min(1, "At least one role is required"),
});

export type AddContactInput = z.infer<typeof addContactSchema>;

/**
 * Step 4: Create title schema
 * AC 20.1.6: Create First Title
 * Simplified from createTitleFormSchema
 */
export const createTitleSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  subtitle: z.string().max(500).optional().or(z.literal("")),
  format: z.string().min(1, "Format is required"),
  publicationDate: z.string().nullable(),
  authorId: z.string().uuid().nullable().optional(),
});

export type CreateTitleInput = z.infer<typeof createTitleSchema>;

/**
 * Step 5: Configure ISBN schema
 * AC 20.1.7: Configure ISBN
 * Simplified from createIsbnPrefixSchema
 */
export const configureIsbnSchema = z.object({
  prefix: z
    .string()
    .min(1, "ISBN prefix is required")
    .regex(/^978-\d+-\d+$/, "Invalid ISBN prefix format (e.g., 978-1-12345)"),
  blockSize: z.number(),
});

export type ConfigureIsbnInput = z.infer<typeof configureIsbnSchema>;

/**
 * Update onboarding step schema
 * For saving progress on step completion
 */
export const updateOnboardingStepSchema = z.object({
  stepNumber: z.number().min(1).max(5),
  completed: z.boolean().or(z.literal("skipped")),
  stepData: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateOnboardingStepInput = z.infer<
  typeof updateOnboardingStepSchema
>;

/**
 * Complete onboarding schema
 * For finalizing the wizard
 */
export const completeOnboardingSchema = z.object({
  skipRemaining: z.boolean().optional(),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

/**
 * Dismiss onboarding schema
 * AC 20.1.11: Dashboard Onboarding Widget - dismiss permanently
 */
export const dismissOnboardingSchema = z.object({
  confirmed: z
    .boolean()
    .refine((val) => val === true, "Must confirm dismissal"),
});

export type DismissOnboardingInput = z.infer<typeof dismissOnboardingSchema>;
