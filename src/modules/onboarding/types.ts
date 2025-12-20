/**
 * Onboarding module types
 * Story 20.1: Build Onboarding Wizard
 */

import type {
  OnboardingProgress as DbOnboardingProgress,
  OnboardingStatus,
  StepData,
  StepsCompleted,
} from "@/db/schema/onboarding";

// Re-export database types
export type { OnboardingStatus, StepData, StepsCompleted };

/**
 * Onboarding progress with computed fields
 */
export interface OnboardingProgress extends DbOnboardingProgress {
  /** Computed: percentage complete based on required steps */
  percentComplete: number;
  /** Computed: is onboarding complete or dismissed */
  isComplete: boolean;
}

/**
 * Onboarding step configuration
 * AC 20.1.2: Multi-Step Wizard Flow
 */
export interface OnboardingStep {
  number: number;
  name: string;
  description: string;
  required: boolean;
}

/**
 * All wizard steps in order
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    number: 1,
    name: "Company Profile",
    description: "Configure company details and settings",
    required: true,
  },
  {
    number: 2,
    name: "Invite Team",
    description: "Invite your first team member",
    required: false,
  },
  {
    number: 3,
    name: "Add Contact",
    description: "Create your first author or contact",
    required: false,
  },
  {
    number: 4,
    name: "Create Title",
    description: "Add your first title to the catalog",
    required: false,
  },
  {
    number: 5,
    name: "Configure ISBN",
    description: "Set up ISBN prefix or import ISBNs",
    required: false,
  },
];

/**
 * Total number of steps
 */
export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * Step status for progress display
 * AC 20.1.8: Progress Indicator
 */
export type StepStatus = "completed" | "current" | "upcoming" | "skipped";

/**
 * Step with current status for UI
 */
export interface OnboardingStepWithStatus extends OnboardingStep {
  status: StepStatus;
}

/**
 * Form data for company profile step
 * AC 20.1.3: Step 1 - Company Profile Setup
 */
export interface CompanyProfileFormData {
  companyName: string;
  fiscalYearStart: string | null;
  currency: string;
  timezone: string;
  statementFrequency: "quarterly" | "annual";
}

/**
 * Form data for invite team step
 * AC 20.1.4: Step 2 - Invite Team Member
 */
export interface InviteTeamFormData {
  email: string;
  name?: string;
  role: "admin" | "editor" | "finance";
}

/**
 * Form data for add contact step
 * AC 20.1.5: Step 3 - Add First Contact
 */
export interface AddContactFormData {
  name: string;
  email?: string;
  roles: string[];
}

/**
 * Form data for create title step
 * AC 20.1.6: Step 4 - Create First Title
 */
export interface CreateTitleFormData {
  title: string;
  subtitle?: string;
  format: string;
  publicationDate?: string | null;
  authorId?: string | null;
}

/**
 * Form data for configure ISBN step
 * AC 20.1.7: Step 5 - Configure ISBN
 */
export interface ConfigureIsbnFormData {
  prefix?: string;
  blockSize?: 100 | 1000 | 10000;
}

/**
 * Combined wizard form data
 */
export interface OnboardingFormData {
  // Step 1
  companyName: string;
  fiscalYearStart: string | null;
  currency: string;
  timezone: string;
  statementFrequency: "quarterly" | "annual";
  // Step 2
  inviteEmail: string;
  inviteName: string;
  inviteRole: "admin" | "editor" | "finance";
  // Step 3
  contactName: string;
  contactEmail: string;
  contactRoles: string[];
  // Step 4
  titleName: string;
  titleSubtitle: string;
  titleFormat: string;
  titlePubDate: string | null;
  titleAuthorId: string | null;
  // Step 5
  isbnPrefix: string;
  isbnBlockSize: 100 | 1000 | 10000;
}

/**
 * Default values for wizard form
 */
export const DEFAULT_FORM_VALUES: OnboardingFormData = {
  // Step 1
  companyName: "",
  fiscalYearStart: null,
  currency: "USD",
  timezone: "America/New_York",
  statementFrequency: "quarterly",
  // Step 2
  inviteEmail: "",
  inviteName: "",
  inviteRole: "editor",
  // Step 3
  contactName: "",
  contactEmail: "",
  contactRoles: ["author"],
  // Step 4
  titleName: "",
  titleSubtitle: "",
  titleFormat: "paperback",
  titlePubDate: null,
  titleAuthorId: null,
  // Step 5
  isbnPrefix: "",
  isbnBlockSize: 100,
};

/**
 * Step completion summary for completion screen
 * AC 20.1.10: Onboarding Completion
 */
export interface OnboardingCompletionSummary {
  companyConfigured: boolean;
  teamMemberInvited: boolean;
  contactCreated: boolean;
  contactName?: string;
  titleCreated: boolean;
  titleName?: string;
  isbnConfigured: boolean;
  isbnPrefix?: string;
}
