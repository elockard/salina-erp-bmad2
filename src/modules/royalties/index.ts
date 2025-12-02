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
  // Story 4.5: Calculation testing
  triggerTestCalculation,
  updateAdvancePaid,
  updateContract,
  updateContractStatus,
} from "./actions";
// Calculator (Story 4.4)
export { calculateRoyaltyForPeriod } from "./calculator";
// Components
export {
  CalculationResults,
  // Story 4.5: Calculation testing
  CalculationTestForm,
  ContractWizardModal,
} from "./components";
// Queries
export {
  type FormatSalesData,
  getApprovedReturnsByFormatForPeriod,
  // Story 4.4: Royalty calculation queries
  getContractByAuthorAndTenant,
  getContractById,
  getContracts,
  getSalesByFormatForPeriod,
  searchAuthorsForContract,
  searchTitlesForContract,
} from "./queries";
// Types
export type {
  AuthorOption,
  Contract,
  ContractCreationResult,
  ContractFormat,
  ContractStatus,
  ContractTier,
  ContractWithRelations,
  FormatCalculation,
  // Story 4.4: Royalty calculation types
  NetSalesData,
  PaginatedContracts,
  RoyaltyCalculation,
  RoyaltyCalculationResult,
  TierBreakdown,
  TierInput,
  TitleOption,
} from "./types";
