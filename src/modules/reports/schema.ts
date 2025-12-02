/**
 * Reports Module Zod Schemas
 *
 * Validation schemas for report filters and inputs.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 2 (Period filtering validation)
 */

import { z } from "zod";

/**
 * Valid period values for revenue filtering
 */
export const reportPeriodSchema = z.enum([
  "day",
  "week",
  "month",
  "quarter",
  "year",
]);

export type ReportPeriodInput = z.infer<typeof reportPeriodSchema>;

/**
 * Date range filter schema
 */
export const dateRangeFilterSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type DateRangeFilterInput = z.infer<typeof dateRangeFilterSchema>;

/**
 * Revenue report filter schema
 */
export const revenueFilterSchema = z.object({
  /** Period grouping for trends */
  period: reportPeriodSchema.optional().default("month"),
  /** Optional date range filter */
  dateRange: dateRangeFilterSchema.optional(),
  /** Filter by specific format */
  format: z.enum(["physical", "ebook", "audiobook"]).optional(),
  /** Filter by specific channel */
  channel: z.enum(["retail", "wholesale", "direct", "distributor"]).optional(),
});

export type RevenueFilterInput = z.infer<typeof revenueFilterSchema>;

/**
 * Liability report filter schema
 */
export const liabilityFilterSchema = z.object({
  /** Filter by specific author ID */
  authorId: z.string().uuid().optional(),
  /** Include paid statements in calculations */
  includePaid: z.boolean().optional().default(false),
});

export type LiabilityFilterInput = z.infer<typeof liabilityFilterSchema>;

/**
 * Export filter schema for generating CSV/PDF reports
 */
export const reportExportSchema = z.object({
  /** Report type to export */
  reportType: z.enum(["revenue", "liability", "combined"]),
  /** Export format */
  format: z.enum(["csv", "pdf"]),
  /** Filter parameters */
  filters: z.union([revenueFilterSchema, liabilityFilterSchema]).optional(),
});

export type ReportExportInput = z.infer<typeof reportExportSchema>;

/**
 * Sales report filter schema
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 2, 3, 4 (Date range, multi-select filters, grouping options)
 */
export const salesReportFilterSchema = z.object({
  /** Start date for the report period (required) */
  startDate: z.date(),
  /** End date for the report period (required) */
  endDate: z.date(),
  /** Optional title IDs to filter by */
  titleIds: z.array(z.string().uuid()).optional(),
  /** Optional author IDs to filter by */
  authorIds: z.array(z.string().uuid()).optional(),
  /** Format filter */
  format: z.enum(["physical", "ebook", "audiobook", "all"]).optional(),
  /** Channel filter */
  channel: z
    .enum(["retail", "wholesale", "direct", "distributor", "all"])
    .optional(),
  /** Grouping option (required) */
  groupBy: z.enum(["title", "format", "channel", "date"]),
});

export type SalesReportFilterInput = z.infer<typeof salesReportFilterSchema>;
