/**
 * Production Module Types
 *
 * TypeScript interfaces for production projects.
 *
 * Story: 18.1 - Create Production Projects
 */

import type { ProductionStatus } from "./schema";

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
}
