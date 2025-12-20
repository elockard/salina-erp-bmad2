/**
 * Inngest Functions Registry
 *
 * Exports all Inngest functions for registration with the serve handler.
 * Add new functions here as they are created.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Story: 5.3 - Build Statement Generation Wizard for Finance
 * Story: 7.4 - Implement Publisher ISBN Prefix System
 * Story: 16.2 - Schedule Automated ONIX Feeds to Ingram
 * Story: 16.3 - Ingest Ingram Order Data
 * Story: 16.4 - Sync Inventory Status with Ingram
 * Story: 16.5 - View Ingram Feed History (Retry Feeds)
 * Story: 17.2 - Schedule Automated ONIX Feeds to Amazon
 * Story: 17.5 - View Amazon Feed History (Retry Feeds)
 * Story: 20.2 - Build Notifications Center (Cleanup Job)
 * Related: src/app/api/inngest/route.ts (serve handler)
 */

import { amazonFeed, amazonFeedRetry } from "./amazon-feed";
import { amazonFeedScheduler } from "./amazon-feed-scheduler";
import { amazonSalesImport } from "./amazon-sales-import";
import { csvExportGenerate } from "./csv-export";
import { generateIsbnPrefixes } from "./generate-isbn-prefixes";
import { generateStatementPdf } from "./generate-statement-pdf";
import { generateStatementsBatch } from "./generate-statements-batch";
import { ingramFeed, ingramFeedRetry } from "./ingram-feed";
import { ingramFeedScheduler } from "./ingram-feed-scheduler";
import { ingramInventoryImport, ingramInventorySync } from "./ingram-inventory";
import { ingramOrders } from "./ingram-orders";
import { notificationCleanup } from "./notification-cleanup";
import { webhookDeliver } from "./webhook-deliver";

/**
 * All Inngest functions to be served
 * Add new functions to this array
 */
export const functions = [
  generateStatementPdf,
  generateStatementsBatch,
  generateIsbnPrefixes,
  ingramFeed,
  ingramFeedRetry,
  ingramFeedScheduler,
  ingramInventorySync,
  ingramInventoryImport,
  ingramOrders,
  amazonFeed,
  amazonFeedRetry,
  amazonFeedScheduler,
  amazonSalesImport,
  webhookDeliver,
  csvExportGenerate,
  notificationCleanup,
];
