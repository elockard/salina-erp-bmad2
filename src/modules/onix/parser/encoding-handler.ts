/**
 * ONIX Encoding Handler
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 1: Create parser infrastructure (AC: 5)
 *
 * Handles character encoding detection and conversion for ONIX files.
 * ONIX 2.1 files often use Latin-1 or Windows-1252 encoding.
 */

/**
 * Supported encodings for ONIX files
 */
export type SupportedEncoding =
  | "utf-8"
  | "iso-8859-1"
  | "windows-1252"
  | "us-ascii";

/**
 * Detects encoding and converts buffer to string
 *
 * Detection strategy:
 * 1. Check for UTF-8 BOM (0xEF 0xBB 0xBF)
 * 2. Parse XML declaration for encoding attribute
 * 3. Default to UTF-8 if not specified
 *
 * @param buffer - ArrayBuffer from file read
 * @returns Decoded string
 */
export function detectAndConvertEncoding(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);

  // Check for UTF-8 BOM
  if (
    uint8Array[0] === 0xef &&
    uint8Array[1] === 0xbb &&
    uint8Array[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  // Check for UTF-16 LE BOM
  if (uint8Array[0] === 0xff && uint8Array[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }

  // Check for UTF-16 BE BOM
  if (uint8Array[0] === 0xfe && uint8Array[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }

  // Read first 200 bytes as ASCII to check XML declaration
  const preview = new TextDecoder("ascii").decode(uint8Array.slice(0, 200));
  const encodingMatch = preview.match(/encoding=["']([^"']+)["']/i);

  if (encodingMatch) {
    const declaredEncoding = encodingMatch[1].toLowerCase();

    // Map common encoding names to TextDecoder-supported names
    const decoderMap: Record<string, string> = {
      "iso-8859-1": "iso-8859-1",
      "iso_8859-1": "iso-8859-1",
      latin1: "iso-8859-1",
      "latin-1": "iso-8859-1",
      "windows-1252": "windows-1252",
      cp1252: "windows-1252",
      "us-ascii": "utf-8", // ASCII is a subset of UTF-8
      ascii: "utf-8",
      "utf-8": "utf-8",
      utf8: "utf-8",
    };

    const decoder = decoderMap[declaredEncoding];
    if (decoder) {
      try {
        return new TextDecoder(decoder).decode(buffer);
      } catch {
        // Fall through to default
      }
    }
  }

  // Try UTF-8 first (most common modern encoding)
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return decoded;
  } catch {
    // UTF-8 failed, try Windows-1252 (common in older ONIX files)
    try {
      return new TextDecoder("windows-1252").decode(buffer);
    } catch {
      // Last resort: ISO-8859-1
      return new TextDecoder("iso-8859-1").decode(buffer);
    }
  }
}

/**
 * Detects the encoding of an XML string from its declaration
 *
 * @param xml - The XML string (already decoded)
 * @returns Detected encoding or null if not declared
 */
export function detectDeclaredEncoding(xml: string): string | null {
  const header = xml.slice(0, 200);
  const match = header.match(/encoding=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Normalizes encoding name to standard format
 *
 * @param encoding - Encoding name from XML declaration
 * @returns Normalized encoding name
 */
export function normalizeEncodingName(encoding: string): SupportedEncoding {
  const lower = encoding.toLowerCase();

  const normalizationMap: Record<string, SupportedEncoding> = {
    "utf-8": "utf-8",
    utf8: "utf-8",
    "iso-8859-1": "iso-8859-1",
    "iso_8859-1": "iso-8859-1",
    latin1: "iso-8859-1",
    "latin-1": "iso-8859-1",
    "windows-1252": "windows-1252",
    cp1252: "windows-1252",
    "us-ascii": "us-ascii",
    ascii: "us-ascii",
  };

  return normalizationMap[lower] || "utf-8";
}

/**
 * Validates that a string appears to be valid XML
 *
 * @param xml - The string to validate
 * @returns Object with isValid flag and optional error
 */
export function validateXMLString(xml: string): {
  isValid: boolean;
  error?: string;
} {
  // Check for null bytes (binary file)
  if (xml.includes("\0")) {
    return {
      isValid: false,
      error: "File appears to be binary, not XML text",
    };
  }

  // Check for XML structure
  if (!xml.includes("<") || !xml.includes(">")) {
    return {
      isValid: false,
      error: "File does not appear to be XML",
    };
  }

  // Check for common encoding issues (replacement character)
  if (xml.includes("\uFFFD")) {
    return {
      isValid: false,
      error:
        "File contains encoding errors. Try specifying the correct encoding.",
    };
  }

  return { isValid: true };
}

/**
 * Removes XML declaration if present (for re-encoding)
 *
 * @param xml - The XML string
 * @returns XML string without declaration
 */
export function stripXMLDeclaration(xml: string): string {
  return xml.replace(/<\?xml[^?]*\?>\s*/i, "");
}

/**
 * Adds UTF-8 XML declaration to string
 *
 * @param xml - The XML string (without declaration)
 * @returns XML string with UTF-8 declaration
 */
export function addUTF8Declaration(xml: string): string {
  const stripped = stripXMLDeclaration(xml);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${stripped}`;
}
