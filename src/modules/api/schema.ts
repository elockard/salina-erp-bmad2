/**
 * API Module Zod Schemas
 *
 * Story 15.1 - AC1: API Key Generation validation
 */

import { z } from "zod";
import { API_SCOPES } from "@/db/schema/api-keys";

/**
 * API Key creation schema
 *
 * Story 15.1 - AC1: API Key Generation
 */
export const apiKeyCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional(),
  scopes: z
    .array(z.enum([API_SCOPES.READ, API_SCOPES.WRITE, API_SCOPES.ADMIN]))
    .min(1, "At least one scope is required"),
  isTest: z.boolean().optional(),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

/**
 * OAuth2 token request schema
 */
export const tokenRequestSchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
