/**
 * Onboarding module exports
 * Story 20.1: Build Onboarding Wizard
 */

// Actions
export {
  completeOnboarding,
  dismissOnboarding,
  goToStep,
  initializeOnboarding,
  skipOnboardingStep,
  startOnboarding,
  updateOnboardingStep,
} from "./actions";
// Components
export { DashboardWidget } from "./components/dashboard-widget";
export { OnboardingCompletion } from "./components/onboarding-completion";
export { OnboardingProgress as OnboardingProgressIndicator } from "./components/onboarding-progress";
export { OnboardingWizard } from "./components/onboarding-wizard";
export { StepAddContact } from "./components/step-add-contact";
export { StepCompanyProfile } from "./components/step-company-profile";
export { StepConfigureIsbn } from "./components/step-configure-isbn";
export { StepCreateTitle } from "./components/step-create-title";
export { StepInviteTeam } from "./components/step-invite-team";
// Queries
export {
  calculateProgress,
  getOnboardingCompletionSummary,
  getOnboardingProgress,
  getStepStatus,
  getStepsWithStatus,
  shouldShowOnboarding,
  shouldShowOnboardingWidget,
} from "./queries";
// Schemas
export {
  type AddContactInput,
  addContactSchema,
  type CompanyProfileInput,
  type CompleteOnboardingInput,
  type ConfigureIsbnInput,
  type CreateTitleInput,
  companyProfileSchema,
  completeOnboardingSchema,
  configureIsbnSchema,
  createTitleSchema,
  type DismissOnboardingInput,
  dismissOnboardingSchema,
  type InviteTeamInput,
  inviteTeamSchema,
  type UpdateOnboardingStepInput,
  updateOnboardingStepSchema,
} from "./schema";
// Types
export {
  type AddContactFormData,
  type CompanyProfileFormData,
  type ConfigureIsbnFormData,
  type CreateTitleFormData,
  DEFAULT_FORM_VALUES,
  type InviteTeamFormData,
  ONBOARDING_STEPS,
  type OnboardingCompletionSummary,
  type OnboardingFormData,
  type OnboardingProgress,
  type OnboardingStatus,
  type OnboardingStep,
  type OnboardingStepWithStatus,
  type StepData,
  type StepStatus,
  type StepsCompleted,
  TOTAL_STEPS,
} from "./types";
