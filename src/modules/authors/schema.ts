import { z } from "zod";

/** Payment method enum for Zod validation */
export const paymentMethodEnum = z.enum([
  "direct_deposit",
  "check",
  "wire_transfer",
]);

/**
 * Zod schema for creating an author
 * - name is required
 * - email is optional but must be valid email format if provided
 * - other fields are optional
 */
export const createAuthorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z
    .string()
    .max(50, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address is too long")
    .optional()
    .or(z.literal("")),
  tax_id: z.string().max(50, "Tax ID is too long").optional().or(z.literal("")),
  payment_method: paymentMethodEnum.optional(),
});

/**
 * Zod schema for updating an author
 * All fields are optional for partial updates
 */
export const updateAuthorSchema = createAuthorSchema.partial();

/** Input type inferred from createAuthorSchema */
export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;

/** Input type inferred from updateAuthorSchema */
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;
