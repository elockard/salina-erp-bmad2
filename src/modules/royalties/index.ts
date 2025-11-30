/**
 * Royalties Module Index
 *
 * Main entry point for the royalties module.
 * Exports actions, queries, types, components, and calculator.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * Story 4.4: Implement Tiered Royalty Calculation Engine
 * Story 4.5: Build Manual Royalty Calculation Trigger (Testing)
 */

// Actions
export {
  createContract,
  searchAuthorsAction,
  searchTitlesAction,
  updateContract,
  updateContractStatus,
  updateAdvancePaid,
  // Story 4.5: Calculation testing
  triggerTestCalculation,
} from "./actions";

// Queries
export {
  getContractById,
  getContracts,
  searchAuthorsForContract,
  searchTitlesForContract,
  // Story 4.4: Royalty calculation queries
  getContractByAuthorAndTenant,
  getSalesByFormatForPeriod,
  getApprovedReturnsByFormatForPeriod,
  type FormatSalesData,
} from "./queries";

// Calculator (Story 4.4)
export { calculateRoyaltyForPeriod } from "./calculator";

// Types
export type {
  AuthorOption,
  Contract,
  ContractCreationResult,
  ContractFormat,
  ContractStatus,
  ContractTier,
  ContractWithRelations,
  PaginatedContracts,
  TierInput,
  TitleOption,
  // Story 4.4: Royalty calculation types
  NetSalesData,
  TierBreakdown,
  FormatCalculation,
  RoyaltyCalculation,
  RoyaltyCalculationResult,
} from "./types";

// Components
export {
  ContractWizardModal,
  // Story 4.5: Calculation testing
  CalculationTestForm,
  CalculationResults,
} from "./components";
