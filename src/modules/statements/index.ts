/**
 * Statements Module
 *
 * Exports for the statements module including:
 * - Server actions for statement operations
 * - Query functions for list and detail views
 * - PDF generation utilities
 * - Email delivery services
 * - Components (wizard, list, detail)
 * - Type definitions
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Story: 5.3 - Build Statement Generation Wizard for Finance
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Story: 5.5 - Build Statements List and Detail View for Finance
 */

// Server Actions
export {
  generateStatementPDF,
  generateStatements,
  getAuthorsWithPendingRoyalties,
  getMyStatementPDFUrl,
  getStatementPDFUrl,
  previewStatementCalculations,
  resendStatementEmail,
} from "./actions";
export type {
  PortalStatementDetailProps,
  PortalStatementListProps,
  StatementDetailModalProps,
  StatementStatsCardsProps,
  StatementStatusBadgeProps,
  StatementsFiltersProps,
  StatementsListProps,
  StatementsPaginationProps,
} from "./components";
// Components (Story 5.5 - List and Detail)
export {
  PortalStatementDetail,
  PortalStatementList,
  StatementDetailModal,
  StatementStatsCards,
  StatementStatusBadge,
  StatementsFilters,
  StatementsList,
  StatementsPagination,
} from "./components";
// Components (Story 5.3 - Wizard)
export { StatementStepAuthors } from "./components/statement-step-authors";
export { StatementStepGenerate } from "./components/statement-step-generate";
export { StatementStepPeriod } from "./components/statement-step-period";
export { StatementStepPreview } from "./components/statement-step-preview";
export { StatementWizardModal } from "./components/statement-wizard-modal";
// Email Types (Story 5.4)
export type {
  EmailDeliveryResult,
  SendStatementEmailParams,
} from "./email-service";
// Email Service (Story 5.4)
export {
  sendStatementEmail,
  validateStatementForEmail,
} from "./email-service";
export type { StatementEmailProps } from "./email-template";
// Email Template (Story 5.4)
export {
  generatePreheader,
  generateSubject,
  renderStatementEmail,
  StatementEmailTemplate,
} from "./email-template";
// PDF Generation
export {
  generatePDFBuffer,
  generateStatementPDF as generatePDF,
} from "./pdf-generator";
export type { StatementStats, StatementsFilter } from "./queries";
// Query Functions (Story 5.5 + Story 5.6)
export {
  getMyStatementById,
  getMyStatements,
  getStatementById,
  getStatementStats,
  getStatements,
  getUniquePeriods,
  searchAuthorsForFilter,
} from "./queries";
// Storage
export {
  generateStatementS3Key,
  getStatementDownloadUrl,
  getStatementPDFBuffer,
  statementPDFExists,
  uploadStatementPDF,
} from "./storage";
// Types
export type {
  AuthorWithPendingRoyalties,
  PaginatedStatements,
  PDFGenerationResult,
  PreviewCalculation,
  PreviewTotals,
  PreviewWarning,
  PreviewWarningType,
  Statement,
  StatementAdvanceRecoupment,
  StatementCalculations,
  StatementFormatBreakdown,
  StatementGenerationRequest,
  StatementGenerationResult,
  StatementPDFData,
  StatementStatus,
  StatementTierBreakdown,
  StatementWithDetails,
  StatementWithRelations,
} from "./types";
