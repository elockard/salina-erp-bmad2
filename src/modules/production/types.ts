/**
 * Production Module Types
 *
 * TypeScript interfaces for production projects.
 *
 * Story: 18.1 - Create Production Projects
 */

import type {
  ProductionStatus,
  TaskStatus,
  TaskType,
  WorkflowStage,
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
 * Proof file with download URL
 * AC-18.4.2, AC-18.4.3: Version history with download capability
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
}

/**
 * Proof file summary for list view
 */
export interface ProofFileSummary {
  totalVersions: number;
  latestVersion: number | null;
  latestUploadedAt: Date | null;
}
