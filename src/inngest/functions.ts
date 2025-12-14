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
 * Related: src/app/api/inngest/route.ts (serve handler)
 */

import { generateIsbnPrefixes } from "./generate-isbn-prefixes";
import { generateStatementPdf } from "./generate-statement-pdf";
import { generateStatementsBatch } from "./generate-statements-batch";
import { ingramFeed } from "./ingram-feed";
import { ingramFeedScheduler } from "./ingram-feed-scheduler";
import { ingramOrders } from "./ingram-orders";

/**
 * All Inngest functions to be served
 * Add new functions to this array
 */
export const functions = [
  generateStatementPdf,
  generateStatementsBatch,
  generateIsbnPrefixes,
  ingramFeed,
  ingramFeedScheduler,
  ingramOrders,
];
