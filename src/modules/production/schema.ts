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
