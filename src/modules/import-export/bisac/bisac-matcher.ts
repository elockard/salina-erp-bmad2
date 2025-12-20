/**
 * BISAC Matcher
 *
 * Keyword-based matching algorithm for suggesting BISAC subject codes
 * based on title metadata. Uses a scoring system that weights:
 * - Exact word matches (30 points)
 * - Partial matches - keyword found in text (20 points)
 * - Fuzzy matches - word prefix matches (10 points)
 * - Genre boost - genre matches BISAC description (25 points)
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 */

import bisacCodesData from "../data/bisac-codes.json";
import type {
  BisacCode,
  BisacSuggestion,
  BisacSuggestionInput,
} from "./bisac-types";
import { DEFAULT_SUGGESTION_COUNT } from "./bisac-types";

// Type the imported JSON data
const bisacCodes: BisacCode[] = bisacCodesData as BisacCode[];

/**
 * Common words to exclude from matching (stop words)
 * These are too common to provide meaningful matches
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "as",
  "be",
  "was",
  "are",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
]);

/**
 * Scoring weights for different match types
 */
const SCORES = {
  EXACT_MATCH: 30,
  PARTIAL_MATCH: 20,
  FUZZY_MATCH: 10,
  GENRE_BOOST: 25,
  MIN_WORD_LENGTH: 3,
  FUZZY_PREFIX_LENGTH: 4,
  MAX_SCORE_NORMALIZATION: 3,
  MAX_CONFIDENCE: 100,
};

/**
 * Suggest BISAC codes based on title metadata
 *
 * Algorithm:
 * 1. Combine title, subtitle, genre into searchable text
 * 2. Extract meaningful words (length >= 3, not stop words)
 * 3. For each BISAC code, check keywords for matches
 * 4. Score matches: exact (30) > partial (20) > fuzzy (10)
 * 5. Apply genre boost if genre matches BISAC description
 * 6. Normalize scores to 0-100 confidence
 * 7. Return top 5 suggestions sorted by confidence
 *
 * @param input - Title metadata to match against
 * @param maxSuggestions - Maximum number of suggestions to return (default: 5)
 * @returns Array of BISAC suggestions sorted by confidence (descending)
 */
export function suggestBisacCodes(
  input: BisacSuggestionInput,
  maxSuggestions: number = DEFAULT_SUGGESTION_COUNT,
): BisacSuggestion[] {
  const { title, subtitle, genre } = input;

  // Handle empty input
  if (!title?.trim()) {
    return [];
  }

  // Combine all text and normalize
  const text = [title, subtitle, genre]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^\w\s]/g, " "); // Remove punctuation

  // Extract meaningful words
  const words = text
    .split(/\s+/)
    .filter((w) => w.length >= SCORES.MIN_WORD_LENGTH && !STOP_WORDS.has(w));

  // No meaningful words to match
  if (words.length === 0) {
    return [];
  }

  // Build suggestions map
  const suggestions = new Map<string, BisacSuggestion>();

  for (const bisac of bisacCodes) {
    let score = 0;
    const matchedKeywords: string[] = [];
    let bestMatchType: "exact" | "partial" | "fuzzy" = "fuzzy";

    for (const keyword of bisac.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact word match - highest value
      if (words.includes(keywordLower)) {
        score += SCORES.EXACT_MATCH;
        matchedKeywords.push(keyword);
        bestMatchType = "exact";
      }
      // Partial match - keyword found somewhere in text
      else if (text.includes(keywordLower)) {
        score += SCORES.PARTIAL_MATCH;
        matchedKeywords.push(keyword);
        if (bestMatchType !== "exact") {
          bestMatchType = "partial";
        }
      }
      // Fuzzy match - word starts with keyword prefix (or vice versa)
      else if (
        words.some(
          (w) =>
            w.startsWith(keywordLower.slice(0, SCORES.FUZZY_PREFIX_LENGTH)) ||
            keywordLower.startsWith(w.slice(0, SCORES.FUZZY_PREFIX_LENGTH)),
        )
      ) {
        score += SCORES.FUZZY_MATCH;
        matchedKeywords.push(keyword);
      }
    }

    // Genre boost - if genre matches BISAC description
    if (
      genre &&
      bisac.description.toLowerCase().includes(genre.toLowerCase())
    ) {
      score += SCORES.GENRE_BOOST;
    }

    // Only include if there's any match
    if (score > 0) {
      // Normalize score to 0-100 confidence
      const confidence = Math.min(
        SCORES.MAX_CONFIDENCE,
        Math.round(score / SCORES.MAX_SCORE_NORMALIZATION),
      );

      suggestions.set(bisac.code, {
        code: bisac.code,
        description: bisac.description,
        confidence,
        matchedKeywords: [...new Set(matchedKeywords)], // Deduplicate
        matchType: bestMatchType,
      });
    }
  }

  // Sort by confidence descending, return top N
  return Array.from(suggestions.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);
}

/**
 * Get all BISAC codes (for browser/selector)
 *
 * @returns All BISAC codes from the data file
 */
export function getAllBisacCodes(): BisacCode[] {
  return bisacCodes;
}

/**
 * Get BISAC code by code string
 *
 * @param code - The BISAC code to look up
 * @returns The BISAC code entry or undefined if not found
 */
export function getBisacCode(code: string): BisacCode | undefined {
  return bisacCodes.find((b) => b.code === code);
}

/**
 * Search BISAC codes by query string
 * Searches code, description, and keywords with prioritized scoring
 *
 * Priority order:
 * 1. Exact code match (highest)
 * 2. Code starts with query
 * 3. Description contains query
 * 4. Keyword matches query
 *
 * @param query - Search query
 * @param limit - Maximum results to return (default: 20)
 * @returns Matching BISAC codes sorted by relevance
 */
export function searchBisacCodes(query: string, limit = 20): BisacCode[] {
  if (!query?.trim()) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const queryUpper = query.toUpperCase().trim();

  // Score each match for prioritization
  type ScoredCode = { code: BisacCode; score: number };
  const scored: ScoredCode[] = [];

  for (const b of bisacCodes) {
    let score = 0;

    // Exact code match (100 points)
    if (b.code === queryUpper) {
      score = 100;
    }
    // Code starts with query (80 points)
    else if (b.code.startsWith(queryUpper)) {
      score = 80;
    }
    // Code contains query (60 points)
    else if (b.code.includes(queryUpper)) {
      score = 60;
    }
    // Description starts with query (50 points)
    else if (b.description.toLowerCase().startsWith(queryLower)) {
      score = 50;
    }
    // Description contains query (40 points)
    else if (b.description.toLowerCase().includes(queryLower)) {
      score = 40;
    }
    // Keyword exact match (30 points)
    else if (b.keywords.some((k) => k.toLowerCase() === queryLower)) {
      score = 30;
    }
    // Keyword contains query (20 points)
    else if (b.keywords.some((k) => k.toLowerCase().includes(queryLower))) {
      score = 20;
    }

    if (score > 0) {
      scored.push({ code: b, score });
    }
  }

  // Sort by score descending, then by code alphabetically
  return scored
    .sort((a, b) => b.score - a.score || a.code.code.localeCompare(b.code.code))
    .slice(0, limit)
    .map((s) => s.code);
}

/**
 * Get BISAC codes by category prefix
 *
 * @param prefix - Category prefix (e.g., "FIC", "BIO")
 * @returns All BISAC codes in that category
 */
export function getBisacCodesByCategory(prefix: string): BisacCode[] {
  return bisacCodes.filter((b) => b.category === prefix.toUpperCase());
}

/**
 * Get unique category prefixes from BISAC codes
 *
 * @returns Array of unique category prefixes with counts
 */
export function getBisacCategories(): Array<{
  prefix: string;
  name: string;
  count: number;
}> {
  const categoryMap = new Map<string, { name: string; count: number }>();

  for (const code of bisacCodes) {
    if (code.depth === 1) {
      // Root level categories
      const existing = categoryMap.get(code.category);
      if (existing) {
        existing.count++;
      } else {
        // Extract category name from description (e.g., "FICTION / General" -> "FICTION")
        const name = code.description.split(" / ")[0];
        categoryMap.set(code.category, { name, count: 1 });
      }
    } else {
      // Increment count for subcategories
      const existing = categoryMap.get(code.category);
      if (existing) {
        existing.count++;
      }
    }
  }

  return Array.from(categoryMap.entries()).map(([prefix, data]) => ({
    prefix,
    name: data.name,
    count: data.count,
  }));
}
