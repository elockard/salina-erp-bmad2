import { z } from "zod";

/**
 * Ingram Credentials Validation Schema
 *
 * Story 16.1 - AC1, AC3: FTP Credential Configuration and Validation
 */

/**
 * Base schema for new credential creation (password required)
 */
export const ingramCredentialsSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .max(255, "Host must not exceed 255 characters"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username must not exceed 100 characters"),
  password: z.string().min(1, "Password is required"),
  port: z
    .number()
    .int()
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535")
    .default(990),
});

export type IngramCredentialsInput = z.infer<typeof ingramCredentialsSchema>;

/**
 * Update schema for editing existing credentials (password optional)
 * AC5: Edit and Disconnect - allows updating without re-entering password
 */
export const ingramCredentialsUpdateSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .max(255, "Host must not exceed 255 characters"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username must not exceed 100 characters"),
  password: z.string().optional(), // Optional for updates - keeps existing if blank
  port: z
    .number()
    .int()
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535")
    .default(990),
});

export type IngramCredentialsUpdateInput = z.infer<
  typeof ingramCredentialsUpdateSchema
>;

/**
 * Form schema for client-side validation (port as string for form input)
 * Password is optional to support edit mode (AC5)
 */
export const ingramCredentialsFormSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .max(255, "Host must not exceed 255 characters"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username must not exceed 100 characters"),
  password: z.string(), // Can be empty for updates
  port: z.string().refine(
    (val) => {
      const num = parseInt(val, 10);
      return !Number.isNaN(num) && num >= 1 && num <= 65535;
    },
    { message: "Port must be between 1 and 65535" },
  ),
});

export type IngramCredentialsFormInput = z.infer<
  typeof ingramCredentialsFormSchema
>;
