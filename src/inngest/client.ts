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
  /**
   * ISBN prefix generation event
   * Story 7.4 AC-7.4.6: Async generation for large ISBN blocks (>1000)
   * Story 7.6: Removed type field - ISBNs are unified without type distinction
   */
  "isbn-prefix/generate": {
    data: {
      prefixId: string;
      tenantId: string;
      prefix: string;
      blockSize: number;
    };
  };
  /**
   * Ingram ONIX feed generation event
   * Story 16.2: Scheduled and manual feed delivery
   */
  "channel/ingram.feed": {
    data: {
      tenantId: string;
      feedType: "full" | "delta";
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
  /**
   * Ingram order ingestion event
   * Story 16.3: Ingest Ingram Order Data
   */
  "channel/ingram.orders": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
  /**
   * Ingram inventory sync event (push to Ingram)
   * Story 16.4: Sync Inventory Status with Ingram
   */
  "channel/ingram.inventory-sync": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
  /**
   * Ingram inventory import event (pull from Ingram)
   * Story 16.4: Sync Inventory Status with Ingram
   */
  "channel/ingram.inventory-import": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
  /**
   * Ingram feed retry event
   * Story 16.5: View Ingram Feed History - Retry Failed Feeds
   */
  "channel/ingram.feed-retry": {
    data: {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };
  };
  /**
   * Amazon ONIX feed generation event
   * Story 17.2: Schedule Automated ONIX Feeds to Amazon
   */
  "channel/amazon.feed": {
    data: {
      tenantId: string;
      feedType: "full" | "delta";
      triggeredBy: "schedule" | "manual";
      userId?: string;
    };
  };
  /**
   * Amazon sales import event
   * Story 17.3: Import Amazon Sales Data
   */
  "channel/amazon.sales-import": {
    data: {
      tenantId: string;
      triggeredBy: "schedule" | "manual";
      userId?: string;
      // Optional date range override (defaults to last import to now)
      startDate?: string; // ISO date
      endDate?: string; // ISO date
    };
  };
  /**
   * Amazon feed retry event
   * Story 17.5: View Amazon Feed History - Retry Failed Feeds
   */
  "channel/amazon.feed-retry": {
    data: {
      tenantId: string;
      originalFeedId: string;
      userId?: string;
    };
  };
  /**
   * Webhook delivery event
   * Story 15.5: Webhook delivery with HMAC signatures
   */
  "webhook/deliver": {
    data: {
      deliveryId: string;
      subscriptionId: string;
      tenantId: string;
      url: string;
      payload: string;
      eventId: string;
      eventType: string;
    };
  };
}
