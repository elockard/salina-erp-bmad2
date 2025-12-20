/**
 * API Sanitization Utilities
 *
 * Story 15.2 - Task 1: Contact field sanitization
 * AC5: Sensitive fields excluded from API responses
 */

/**
 * Sensitive contact fields that must be excluded from API responses
 *
 * Per AC5:
 * - tax_id, tin_encrypted, tin_type, tin_last_four (tax information)
 * - payment_info (financial data)
 * - w9_received, w9_received_date (compliance status)
 */
export const CONTACT_SENSITIVE_FIELDS = [
  "tax_id",
  "tin_encrypted",
  "tin_type",
  "tin_last_four",
  "payment_info",
  "w9_received",
  "w9_received_date",
] as const;

export type ContactSensitiveField = (typeof CONTACT_SENSITIVE_FIELDS)[number];

/**
 * Remove sensitive fields from contact object
 *
 * Creates a shallow copy with sensitive fields removed.
 * Does not modify the original object.
 *
 * @param contact - Contact record with potential sensitive fields
 * @returns New object without sensitive fields
 */
export function sanitizeContact<T extends Record<string, unknown>>(
  contact: T,
): Omit<T, ContactSensitiveField> {
  const sanitized = { ...contact };

  for (const field of CONTACT_SENSITIVE_FIELDS) {
    delete sanitized[field];
  }

  return sanitized as Omit<T, ContactSensitiveField>;
}

/**
 * Sanitize an array of contacts
 *
 * @param contacts - Array of contact records
 * @returns Array of sanitized contacts
 */
export function sanitizeContacts<T extends Record<string, unknown>>(
  contacts: T[],
): Omit<T, ContactSensitiveField>[] {
  return contacts.map(sanitizeContact);
}
