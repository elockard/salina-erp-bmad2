/**
 * Production Module Types
 *
 * TypeScript interfaces for production projects.
 *
 * Story: 18.1 - Create Production Projects
 * Story: 18.7 - Generate BISG-Compliant Shipping Labels
 */

import { z } from "zod";

import type {
  ProductionStatus,
  ProofApprovalStatus,
  TaskStatus,
  TaskType,
  WorkflowStage,
  WorkflowStageHistoryEntry,
} from "./schema";

/**
 * Production project with title info (for list/detail views)
 */
export interface ProductionProjectWithTitle {
  id: string;
  tenantId: string;
  titleId: string;
  titleName: string;
  isbn13?: string | null;
  targetPublicationDate: string | null;
  status: ProductionStatus;
  manuscriptFileName: string | null;
  manuscriptFileSize: string | null;
  manuscriptDownloadUrl?: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Title option for select dropdown
 */
export interface TitleOption {
  id: string;
  name: string;
  isbn13?: string | null;
}

/**
 * Production project action result
 */
export interface ActionResult {
  success: boolean;
  id?: string;
  message?: string;
  /** Whether vendor notification email was sent (only for task actions) */
  emailSent?: boolean;
  /** Warning about email (e.g., no vendor assigned) */
  emailWarning?: string;
  /** Version number for proof file uploads (Story 18.4) */
  version?: number;
}

// ============================================================================
// Production Tasks Types (Story 18.2)
// ============================================================================

/**
 * Production task with vendor info (for list/detail views)
 * AC-18.2.5: Task list with name, type, vendor, due date, status
 */
export interface ProductionTaskWithVendor {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string | null;
  taskType: TaskType;
  status: TaskStatus;
  vendorId: string | null;
  vendorName: string | null;
  vendorEmail: string | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Production task with full project and vendor info
 */
export interface ProductionTaskWithDetails extends ProductionTaskWithVendor {
  projectTitle: string;
}

/**
 * Vendor option for select dropdown
 * AC-18.2.3: Only contacts with vendor role and active status
 */
export interface VendorOption {
  id: string;
  name: string;
  email: string | null;
  leadTimeDays?: number | null;
}

// ============================================================================
// Production Board Types (Story 18.3)
// ============================================================================

/**
 * Production project card for Kanban board
 * AC-18.3.1, AC-18.3.6: Card data for board display
 */
export interface BoardProjectCard {
  id: string;
  titleName: string;
  isbn13: string | null;
  targetPublicationDate: string | null;
  workflowStage: WorkflowStage;
  stageEnteredAt: Date | null;
  daysInStage: number;
  taskStats: {
    total: number;
    completed: number;
  };
  isOverdue: boolean;
}

/**
 * Production board data grouped by workflow stage
 * AC-18.3.1: Kanban board with columns per stage
 */
export interface ProductionBoardData {
  stages: Record<WorkflowStage, BoardProjectCard[]>;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
}

/**
 * Production project with workflow stage info
 * AC-18.3.2: Extended type with new workflow fields
 */
export interface ProductionProjectWithWorkflow
  extends ProductionProjectWithTitle {
  workflowStage: WorkflowStage;
  stageEnteredAt: Date | null;
}

// ============================================================================
// Proof File Types (Story 18.4)
// ============================================================================

/**
 * Proof file with download URL and approval status
 * AC-18.4.2, AC-18.4.3: Version history with download capability
 * AC-18.5.4: Approval status on each proof version
 */
export interface ProofFileWithUrl {
  id: string;
  version: number;
  fileName: string;
  fileSize: string;
  mimeType: string;
  notes: string | null;
  uploadedAt: Date;
  uploadedBy: string;
  uploaderName: string;
  downloadUrl: string;
  /** Approval status (Story 18.5) */
  approvalStatus: ProofApprovalStatus;
  /** Notes from correction request */
  approvalNotes: string | null;
  /** When approval action was taken */
  approvedAt: Date | null;
  /** User who took approval action */
  approvedBy: string | null;
}

/**
 * Proof file summary for list view
 */
export interface ProofFileSummary {
  totalVersions: number;
  latestVersion: number | null;
  latestUploadedAt: Date | null;
}

// ============================================================================
// Calendar Types (Story 18.6)
// ============================================================================

/**
 * Calendar event type
 * AC-18.6.1: Events from publication dates and task due dates
 */
export type CalendarEventType = "publication_date" | "task_due_date";

/**
 * Calendar event for production calendar
 * AC-18.6.1: Calendar view with milestone dates
 * AC-18.6.3: Overdue highlighting
 * AC-18.6.5: Event details with project info
 */
export interface CalendarEvent {
  /** Unique event ID (prefixed with type) */
  id: string;
  /** Display title for calendar */
  title: string;
  /** Event start date */
  start: Date;
  /** Event end date (same as start for single-day events) */
  end: Date;
  /** Event type (publication or task) */
  type: CalendarEventType;
  /** Production project ID for navigation */
  projectId: string;
  /** Project title name for display */
  projectTitle: string;
  /** Current workflow stage */
  workflowStage: WorkflowStage;
  /** Whether event is past due */
  isOverdue: boolean;
  /** Task ID (only for task events) */
  taskId?: string;
  /** Vendor name (only for task events with vendor) */
  vendorName?: string | null;
}

/**
 * Calendar view mode options
 * AC-18.6.1: Month, week, day views
 */
export type CalendarViewMode = "month" | "week" | "day";

/**
 * Calendar filter options
 * AC-18.6.2: Filter by date range
 */
export interface CalendarFilter {
  /** Start of date range filter */
  dateFrom?: Date;
  /** End of date range filter */
  dateTo?: Date;
  /** Current view mode */
  viewMode: CalendarViewMode;
}

// ============================================================================
// Author Portal Types (Story 21.1)
// ============================================================================

/**
 * Production project data for author portal view
 * Story 21.1: View Production Status in Author Portal
 * AC-21.1.1: Author sees production status for titles
 * AC-21.1.4: Stage history for timeline visualization
 */
export interface AuthorProductionProject {
  /** Production project ID */
  projectId: string;
  /** Title ID */
  titleId: string;
  /** Title name for display */
  titleName: string;
  /** ISBN-13 (optional) */
  isbn: string | null;
  /** Current workflow stage */
  workflowStage: WorkflowStage;
  /** When project entered current stage */
  stageEnteredAt: Date | null;
  /** Target publication date */
  targetPublicationDate: string | null;
  /** Whether project is overdue (AC-21.1.5) */
  isOverdue: boolean;
  /** Stage transition history for timeline visualization (AC-21.1.4) */
  stageHistory: WorkflowStageHistoryEntry[];
}

// ============================================================================
// Label Generation Types (Story 18.7)
// ============================================================================

/**
 * Label type for generation
 * AC-18.7.5: User can select label type
 */
export type LabelType = "shipping" | "carton" | "product";

/**
 * Carton configuration for label generation
 * AC-18.7.2: Configure carton contents
 */
export interface CartonConfig {
  /** Number of books per carton */
  quantityPerCarton: number;
  /** Current carton number (1-indexed) */
  cartonNumber: number;
  /** Total number of cartons */
  totalCartons: number;
}

/**
 * Base label data from database query
 * Story 18.7: Uses titleAuthors for multi-author support (Story 10.1)
 */
export interface LabelData {
  /** ISBN-13 (with or without hyphens) */
  isbn: string;
  /** Book title */
  title: string;
  /** Primary author name */
  author: string;
  /** Publisher name (from tenant) */
  publisher: string;
}

/**
 * Shipping label data with GS1-128 barcode
 * AC-18.7.1: GS1-128 with GTIN-14 encoding
 * AC-18.7.2: Carton configuration
 */
export interface ShippingLabelData {
  type: "shipping";
  /** GTIN-14 (14 digits) */
  gtin14: string;
  /** ISBN-13 for display */
  isbn: string;
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Publisher name */
  publisher: string;
  /** Carton configuration */
  cartonConfig: CartonConfig;
  /** Base64-encoded PNG barcode image */
  barcodeImage: string;
}

/**
 * Carton label data with GS1-128 barcode
 * AC-18.7.2: Carton labels with quantity and carton number
 */
export interface CartonLabelData {
  type: "carton";
  /** GTIN-14 (14 digits) */
  gtin14: string;
  /** ISBN-13 for display */
  isbn: string;
  /** Book title */
  title: string;
  /** Quantity per carton */
  quantity: number;
  /** Current carton number (1-indexed) */
  cartonNumber: number;
  /** Total number of cartons */
  totalCartons: number;
  /** Base64-encoded PNG barcode image */
  barcodeImage: string;
}

/**
 * Product label data with EAN-13 barcode
 * AC-18.7.3: Product labels with publisher info
 */
export interface ProductLabelData {
  type: "product";
  /** ISBN-13 for barcode and display */
  isbn: string;
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Publisher name */
  publisher: string;
  /** Base64-encoded PNG barcode image (EAN-13) */
  barcodeImage: string;
}

/**
 * Union type for all label data types
 */
export type AnyLabelData =
  | ShippingLabelData
  | CartonLabelData
  | ProductLabelData;

// ============================================================================
// Label Generation Zod Schemas (Story 18.7)
// ============================================================================

/**
 * Zod schema for carton configuration validation
 * AC-18.7.2: Validate carton config input
 */
export const cartonConfigSchema = z
  .object({
    quantityPerCarton: z
      .number()
      .int()
      .min(1, "Quantity must be at least 1")
      .max(9999, "Quantity cannot exceed 9999"),
    cartonNumber: z.number().int().min(1, "Carton number must be at least 1"),
    totalCartons: z
      .number()
      .int()
      .min(1, "Total cartons must be at least 1")
      .max(999, "Total cartons cannot exceed 999"),
  })
  .refine((data) => data.cartonNumber <= data.totalCartons, {
    message: "Carton number cannot exceed total cartons",
  });

/**
 * Zod schema for label generation request validation
 * AC-18.7.5, AC-18.7.6: Validate API request
 */
export const labelGenerationRequestSchema = z
  .object({
    projectId: z.string().uuid("Invalid project ID"),
    labelType: z.enum(["shipping", "carton", "product"]),
    cartonConfig: cartonConfigSchema.optional(),
  })
  .refine(
    (data) => {
      // Carton config required for shipping and carton labels
      if (data.labelType === "shipping" || data.labelType === "carton") {
        return data.cartonConfig !== undefined;
      }
      return true;
    },
    { message: "Carton configuration required for shipping and carton labels" },
  );

/**
 * TypeScript type inferred from Zod schema
 */
export type LabelGenerationRequest = z.infer<
  typeof labelGenerationRequestSchema
>;
