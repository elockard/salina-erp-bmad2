/**
 * Inngest Client Configuration
 *
 * Singleton Inngest client for background job processing.
 * All Inngest functions should be created using this client.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Related: docs/architecture.md (Background Jobs section)
 */

import { Inngest } from "inngest";

/**
 * Inngest client instance
 * ID should match your Inngest app name
 */
export const inngest = new Inngest({
  id: "salina-erp",
  /**
   * Event schemas for type safety
   * Add new event types here as they are created
   */
});

/**
 * Event type definitions for type safety
 */
export interface InngestEvents {
  "statements/pdf.generate": {
    data: {
      statementId: string;
      tenantId: string;
    };
  };
  /**
   * Batch statement generation event
   * Story 5.3 AC-5.3.5: Enqueues Inngest job for background processing
   */
  "statements/generate.batch": {
    data: {
      tenantId: string;
      periodStart: string; // ISO date string
      periodEnd: string; // ISO date string
      authorIds: string[];
      sendEmail: boolean;
      userId: string;
    };
  };
}
