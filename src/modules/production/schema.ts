/**
 * Production Projects Validation Schemas
 *
 * Zod schemas for production project operations.
 * Includes status constants and transition validation.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.2: Status transitions (draft→in-progress→completed, any→cancelled)
 */

import { z } from "zod";

/**
 * Production project status constants
 * AC-18.1.2: draft, in-progress, completed, cancelled
 */
export const PRODUCTION_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type ProductionStatus =
  (typeof PRODUCTION_STATUS)[keyof typeof PRODUCTION_STATUS];

/**
 * Status display labels
 */
export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  [PRODUCTION_STATUS.DRAFT]: "Draft",
  [PRODUCTION_STATUS.IN_PROGRESS]: "In Progress",
  [PRODUCTION_STATUS.COMPLETED]: "Completed",
  [PRODUCTION_STATUS.CANCELLED]: "Cancelled",
};

/**
 * Valid status transitions
 * AC-18.1.2: draft→in-progress→completed, any→cancelled
 */
const VALID_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  [PRODUCTION_STATUS.DRAFT]: [
    PRODUCTION_STATUS.IN_PROGRESS,
    PRODUCTION_STATUS.CANCELLED,
  ],
  [PRODUCTION_STATUS.IN_PROGRESS]: [
    PRODUCTION_STATUS.COMPLETED,
    PRODUCTION_STATUS.CANCELLED,
  ],
  [PRODUCTION_STATUS.COMPLETED]: [PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.CANCELLED]: [],
};

/**
 * Check if status transition is valid
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is allowed
 */
export function isValidStatusTransition(
  from: ProductionStatus,
  to: ProductionStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next statuses for current status
 *
 * @param current - Current status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(
  current: ProductionStatus,
): ProductionStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Create production project schema
 * AC-18.1.1: Select title, set target date, optional notes
 */
export const createProductionProjectSchema = z.object({
  titleId: z.string().uuid("Invalid title ID"),
  targetPublicationDate: z.string().optional().nullable(),
  notes: z.string().max(5000, "Notes too long").optional().nullable(),
});

export type CreateProductionProjectInput = z.infer<
  typeof createProductionProjectSchema
>;

/**
 * Update production project schema
 */
export const updateProductionProjectSchema = z.object({
  targetPublicationDate: z.string().optional().nullable(),
  notes: z.string().max(5000, "Notes too long").optional().nullable(),
});

export type UpdateProductionProjectInput = z.infer<
  typeof updateProductionProjectSchema
>;

/**
 * Update status schema
 * AC-18.1.2: Status transitions
 */
export const updateStatusSchema = z.object({
  status: z.enum([
    PRODUCTION_STATUS.DRAFT,
    PRODUCTION_STATUS.IN_PROGRESS,
    PRODUCTION_STATUS.COMPLETED,
    PRODUCTION_STATUS.CANCELLED,
  ]),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/**
 * Filter schema for list view
 * AC-18.1.4: Filter by status, search by title name
 */
export const productionProjectFilterSchema = z.object({
  status: z
    .enum([
      PRODUCTION_STATUS.DRAFT,
      PRODUCTION_STATUS.IN_PROGRESS,
      PRODUCTION_STATUS.COMPLETED,
      PRODUCTION_STATUS.CANCELLED,
    ])
    .optional(),
  search: z.string().optional(),
});

export type ProductionProjectFilter = z.infer<
  typeof productionProjectFilterSchema
>;

// ============================================================================
// Production Tasks Schemas (Story 18.2)
// ============================================================================

/**
 * Task type constants
 * AC-18.2.1: editing, design, proofing, printing, other
 */
export const TASK_TYPES = [
  "editing",
  "design",
  "proofing",
  "printing",
  "other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/**
 * Task type display labels
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  editing: "Editing",
  design: "Design",
  proofing: "Proofing",
  printing: "Printing",
  other: "Other",
};

/**
 * Task status constants
 * AC-18.2.2: pending, in-progress, completed, cancelled
 */
export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/**
 * Task status display labels
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUS.PENDING]: "Pending",
  [TASK_STATUS.IN_PROGRESS]: "In Progress",
  [TASK_STATUS.COMPLETED]: "Completed",
  [TASK_STATUS.CANCELLED]: "Cancelled",
};

/**
 * Valid task status transitions
 * AC-18.2.2: pending→in-progress,cancelled; in-progress→completed,cancelled
 */
const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TASK_STATUS.PENDING]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELLED],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
  [TASK_STATUS.COMPLETED]: [],
  [TASK_STATUS.CANCELLED]: [],
};

/**
 * Check if task status transition is valid
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is allowed
 */
export function isValidTaskStatusTransition(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next task statuses for current status
 *
 * @param current - Current status
 * @returns Array of valid next statuses
 */
export function getValidNextTaskStatuses(current: TaskStatus): TaskStatus[] {
  return VALID_TASK_TRANSITIONS[current] ?? [];
}

/**
 * Create production task schema
 * AC-18.2.1: Create task with type, name, optional vendor, optional due date
 */
export const createProductionTaskSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z
    .string()
    .max(2000, "Description too long")
    .optional()
    .nullable(),
  taskType: z.enum(TASK_TYPES),
  vendorId: z.string().uuid("Invalid vendor ID").optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(5000, "Notes too long").optional().nullable(),
});

export type CreateProductionTaskInput = z.infer<
  typeof createProductionTaskSchema
>;

/**
 * Update production task schema
 * AC-18.2.6: Edit name, type, vendor, due date, notes
 */
export const updateProductionTaskSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .optional(),
  description: z
    .string()
    .max(2000, "Description too long")
    .optional()
    .nullable(),
  taskType: z.enum(TASK_TYPES).optional(),
  vendorId: z.string().uuid("Invalid vendor ID").optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(5000, "Notes too long").optional().nullable(),
});

export type UpdateProductionTaskInput = z.infer<
  typeof updateProductionTaskSchema
>;

/**
 * Update task status schema
 * AC-18.2.2: Status transitions
 */
export const updateTaskStatusSchema = z.object({
  status: z.enum([
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.COMPLETED,
    TASK_STATUS.CANCELLED,
  ]),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

/**
 * Task filter schema for list view
 * AC-18.2.5: Filter by status
 */
export const productionTaskFilterSchema = z.object({
  status: z
    .enum([
      TASK_STATUS.PENDING,
      TASK_STATUS.IN_PROGRESS,
      TASK_STATUS.COMPLETED,
      TASK_STATUS.CANCELLED,
    ])
    .optional(),
});

export type ProductionTaskFilter = z.infer<typeof productionTaskFilterSchema>;

// ============================================================================
// Workflow Stage Schemas (Story 18.3)
// ============================================================================

/**
 * Workflow stage constants for Kanban board
 * AC-18.3.2: manuscript_received, editing, design, proof, print_ready, complete
 */
export const WORKFLOW_STAGES = [
  "manuscript_received",
  "editing",
  "design",
  "proof",
  "print_ready",
  "complete",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/**
 * Workflow stage display labels
 * AC-18.3.1: Column headers for Kanban board
 */
export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  manuscript_received: "Manuscript Received",
  editing: "Editing",
  design: "Design",
  proof: "Proof",
  print_ready: "Print Ready",
  complete: "Complete",
};

/**
 * Stage order for transition validation
 * AC-18.3.3: Only +-1 stage transitions allowed
 */
const WORKFLOW_STAGE_ORDER: Record<WorkflowStage, number> = {
  manuscript_received: 0,
  editing: 1,
  design: 2,
  proof: 3,
  print_ready: 4,
  complete: 5,
};

/**
 * Check if workflow stage transition is valid
 * AC-18.3.3: Can only move forward or backward one stage at a time
 *
 * @param from - Current workflow stage
 * @param to - Target workflow stage
 * @returns true if transition is allowed (adjacent stage only)
 */
export function isValidWorkflowTransition(
  from: WorkflowStage,
  to: WorkflowStage,
): boolean {
  const fromOrder = WORKFLOW_STAGE_ORDER[from];
  const toOrder = WORKFLOW_STAGE_ORDER[to];
  const diff = Math.abs(toOrder - fromOrder);
  return diff === 1;
}

// Re-export WorkflowStageHistoryEntry from db schema to avoid duplication
// AC-18.3.4: Track all stage transitions with timestamps
export type { WorkflowStageHistoryEntry } from "@/db/schema/production-projects";

/**
 * Update workflow stage schema
 * AC-18.3.3: Validate target stage
 */
export const updateWorkflowStageSchema = z.object({
  workflowStage: z.enum(WORKFLOW_STAGES),
});

// ============================================================================
// Proof File Schemas (Story 18.4)
// ============================================================================

/**
 * Upload proof file schema
 * AC-18.4.1: Upload proof with optional notes
 */
export const uploadProofFileSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

export type UploadProofFileInput = z.infer<typeof uploadProofFileSchema>;

/**
 * Update proof notes schema
 * AC-18.4.5: Edit notes for a proof version
 */
export const updateProofNotesSchema = z.object({
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

export type UpdateProofNotesInput = z.infer<typeof updateProofNotesSchema>;

// ============================================================================
// Proof Approval Schemas (Story 18.5)
// ============================================================================

/**
 * Proof approval status values
 * AC-18.5.4: Track approval status on each proof version
 */
export const PROOF_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "corrections_requested",
] as const;

export type ProofApprovalStatus = (typeof PROOF_APPROVAL_STATUSES)[number];

/**
 * Approve proof schema
 * AC-18.5.1: Approve a proof to move project to print_ready stage
 */
export const approveProofSchema = z.object({
  proofId: z.string().uuid("Invalid proof ID"),
});

export type ApproveProofInput = z.infer<typeof approveProofSchema>;

/**
 * Request corrections schema
 * AC-18.5.2: Request corrections with required notes (min 10 chars)
 */
export const requestCorrectionsSchema = z.object({
  proofId: z.string().uuid("Invalid proof ID"),
  notes: z
    .string()
    .min(10, "Correction notes must be at least 10 characters")
    .max(2000, "Notes too long"),
});

export type RequestCorrectionsInput = z.infer<typeof requestCorrectionsSchema>;
