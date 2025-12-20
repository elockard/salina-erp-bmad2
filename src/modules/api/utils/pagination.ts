/**
 * API Pagination Utilities
 *
 * Story 15.2 - Task 1: Cursor-based pagination helpers
 * AC1, AC5, AC6: Paginated list endpoints
 */

/**
 * Default page size (AC1: default 20)
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum page size (AC1: max 100)
 */
export const MAX_LIMIT = 100;

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  cursor?: string;
  limit: number;
}

/**
 * Pagination response metadata
 */
export interface PaginationMeta {
  cursor: string | null;
  has_more: boolean;
  total_count: number;
}

/**
 * Paginated API response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Decoded cursor data
 */
interface CursorData {
  id: string;
  ts: Date;
}

/**
 * Encode cursor for pagination
 *
 * Uses base64-encoded JSON with id and timestamp for stable cursor-based pagination.
 * This approach avoids offset-based pagination performance issues with large datasets.
 *
 * @param id - Record ID
 * @param timestamp - Record updated_at timestamp
 * @returns Base64-encoded cursor string
 */
export function encodeCursor(id: string, timestamp: Date): string {
  const data = { id, ts: timestamp.toISOString() };
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

/**
 * Decode cursor from pagination request
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded cursor data or null if invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  if (!cursor) return null;

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString());

    // Validate required fields
    if (typeof decoded.id !== "string" || typeof decoded.ts !== "string") {
      return null;
    }

    const ts = new Date(decoded.ts);
    if (Number.isNaN(ts.getTime())) {
      return null;
    }

    return { id: decoded.id, ts };
  } catch {
    return null;
  }
}

/**
 * Parse pagination parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams {
  const cursor = searchParams.get("cursor") || undefined;
  let limit = Number.parseInt(searchParams.get("limit") || "", 10);

  // Validate limit
  if (Number.isNaN(limit) || limit <= 0) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  return { cursor, limit };
}

/**
 * Build pagination metadata for response
 *
 * @param items - Fetched items (should include one extra to check has_more)
 * @param limit - Requested limit
 * @param totalCount - Total count of records
 * @param getTimestamp - Function to extract timestamp from item
 * @param getId - Function to extract ID from item
 * @returns Pagination metadata
 */
export function buildPaginationMeta<T>(
  items: T[],
  limit: number,
  totalCount: number,
  getTimestamp: (item: T) => Date,
  getId: (item: T) => string,
): PaginationMeta {
  const hasMore = items.length > limit;
  const data = items.slice(0, limit);
  const lastItem = data[data.length - 1];

  return {
    cursor:
      hasMore && lastItem
        ? encodeCursor(getId(lastItem), getTimestamp(lastItem))
        : null,
    has_more: hasMore,
    total_count: totalCount,
  };
}
