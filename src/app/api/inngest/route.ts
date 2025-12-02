/**
 * Inngest API Route
 *
 * Serves Inngest functions and handles incoming events from the Inngest service.
 * This route is the entry point for all Inngest background job execution.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Related: src/inngest/functions.ts (function registry)
 *
 * Deployment:
 * - Set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in environment
 * - Inngest will call this endpoint to execute functions
 */

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

/**
 * Inngest serve handler
 * Registers all functions and handles incoming requests
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
