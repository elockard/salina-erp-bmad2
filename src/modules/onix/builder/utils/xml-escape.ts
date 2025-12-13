/**
 * ONIX XML Utilities
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Task 1: Create ONIX module structure
 *
 * Provides XML escaping and null-safe element building for ONIX generation.
 * CRITICAL: Empty tags invalidate ONIX files - always use optionalElement for optional fields.
 */

/**
 * Escape special XML characters in text content.
 *
 * Per ONIX standard, these 5 characters must be escaped:
 * - & → &amp;
 * - < → &lt;
 * - > → &gt;
 * - " → &quot;
 * - ' → &apos;
 *
 * @param str - Text content to escape
 * @returns XML-safe escaped string
 */
export function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build an XML element only if value is non-empty.
 *
 * CRITICAL: Empty tags like <Tag></Tag> or <Tag/> invalidate ONIX files.
 * This helper returns empty string for null/undefined/empty values,
 * ensuring the element is completely omitted from output.
 *
 * @param tag - XML tag name
 * @param value - Text content (may be null/undefined/empty)
 * @returns XML element string or empty string if no value
 */
export function optionalElement(
  tag: string,
  value: string | null | undefined,
): string {
  if (!value || value.trim() === "") {
    return "";
  }
  return `<${tag}>${escapeXML(value)}</${tag}>`;
}

/**
 * Format a Date for ONIX SentDateTime element.
 *
 * ONIX 3.1 uses ISO 8601 compact format: YYYYMMDDTHHMMSSz
 *
 * @param date - JavaScript Date object
 * @returns Formatted string like "20251212T120000Z"
 */
export function formatSentDateTime(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Format a Date for ONIX PublishingDate element.
 *
 * ONIX uses YYYYMMDD format for publication dates.
 *
 * @param date - JavaScript Date object
 * @returns Formatted string like "20251201"
 */
export function formatPublishingDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
