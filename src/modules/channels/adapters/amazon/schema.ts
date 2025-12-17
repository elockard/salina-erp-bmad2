import { z } from "zod";

/**
 * Amazon Channel Schema
 *
 * Story 17.1 - Configure Amazon Account Connection
 * AC1: Amazon Account Type Selection
 * AC2: API Credential Configuration
 * AC4: Credential Validation
 */

/**
 * Amazon program types
 * - kdp: Kindle Direct Publishing (Seller Central)
 * - advantage: Amazon Advantage (Vendor Central)
 */
export const AMAZON_PROGRAM_TYPES = {
  KDP: "kdp",
  ADVANTAGE: "advantage",
} as const;

export type AmazonProgramType =
  (typeof AMAZON_PROGRAM_TYPES)[keyof typeof AMAZON_PROGRAM_TYPES];

/**
 * Amazon marketplace IDs
 * Reference: https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
 */
export const AMAZON_MARKETPLACES = {
  US: { id: "ATVPDKIKX0DER", name: "United States", code: "US" },
  CA: { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA" },
  UK: { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK" },
  DE: { id: "A1PA6795UKMFR9", name: "Germany", code: "DE" },
  FR: { id: "A13V1IB3VIYBER", name: "France", code: "FR" },
  ES: { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES" },
  IT: { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT" },
  JP: { id: "A1VC38T7YXB528", name: "Japan", code: "JP" },
  AU: { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU" },
} as const;

export type AmazonMarketplaceCode = keyof typeof AMAZON_MARKETPLACES;

/**
 * Amazon credentials schema
 * Story 17.1 - AC2: API Credential Configuration
 * Story 17.1 - AC4: Credential Validation
 */
export const amazonCredentialsSchema = z.object({
  programType: z.enum(
    [AMAZON_PROGRAM_TYPES.KDP, AMAZON_PROGRAM_TYPES.ADVANTAGE],
    {
      message: "Program type is required",
    },
  ),
  accessKeyId: z
    .string()
    .min(16, "Access Key ID must be at least 16 characters")
    .max(128, "Access Key ID is too long")
    .regex(/^[A-Z0-9]+$/, "Access Key ID must be uppercase alphanumeric"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  marketplace: z.enum(
    Object.keys(AMAZON_MARKETPLACES) as [
      AmazonMarketplaceCode,
      ...AmazonMarketplaceCode[],
    ],
    { message: "Marketplace is required" },
  ),
  // Optional: LWA (Login with Amazon) credentials for SP-API
  lwaClientId: z.string().optional(),
  lwaClientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type AmazonCredentialsInput = z.infer<typeof amazonCredentialsSchema>;

/**
 * Amazon credentials form schema - allows empty secretAccessKey for edit mode
 * When editing existing credentials, users can leave secret blank to keep existing value
 *
 * Story 17.1 - AC6: Edit credentials
 */
export const amazonCredentialsFormSchema = z.object({
  programType: z.enum(
    [AMAZON_PROGRAM_TYPES.KDP, AMAZON_PROGRAM_TYPES.ADVANTAGE],
    {
      message: "Program type is required",
    },
  ),
  accessKeyId: z
    .string()
    .min(16, "Access Key ID must be at least 16 characters")
    .max(128, "Access Key ID is too long")
    .regex(/^[A-Z0-9]+$/, "Access Key ID must be uppercase alphanumeric"),
  secretAccessKey: z.string(), // Can be empty for updates (AC6)
  marketplace: z.enum(
    Object.keys(AMAZON_MARKETPLACES) as [
      AmazonMarketplaceCode,
      ...AmazonMarketplaceCode[],
    ],
    { message: "Marketplace is required" },
  ),
  lwaClientId: z.string().optional(),
  lwaClientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type AmazonCredentialsFormInput = z.infer<
  typeof amazonCredentialsFormSchema
>;

/**
 * Stored Amazon credentials (encrypted JSON structure)
 */
export interface AmazonStoredCredentials {
  programType: AmazonProgramType;
  accessKeyId: string;
  secretAccessKey: string;
  marketplaceId: string;
  marketplaceCode: AmazonMarketplaceCode;
  lwaClientId?: string;
  lwaClientSecret?: string;
  refreshToken?: string;
}
