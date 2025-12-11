/**
 * Tax ID Encryption Utility
 *
 * Provides AES-256-GCM encryption for sensitive data like Tax IDs.
 * Uses Node.js built-in crypto module.
 *
 * Story: 2.2 - Build Author Management Split View Interface
 * AC: 30, 31 - Tax ID encrypted before storage, decrypted only for authorized roles
 *
 * Environment Variable Required:
 * - ENCRYPTION_KEY: 32-byte hex string (64 hex characters)
 *   Generate with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Get the encryption key from environment
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Generate with: openssl rand -hex 32",
    );
  }

  if (keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32",
    );
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a Tax ID using AES-256-GCM
 *
 * @param plainText - The Tax ID to encrypt
 * @returns Base64-encoded string in format: iv:authTag:ciphertext
 */
export function encryptTaxId(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a Tax ID using AES-256-GCM
 *
 * @param cipherText - Base64-encoded string in format: iv:authTag:ciphertext
 * @returns The decrypted Tax ID
 * @throws Error if decryption fails (invalid format, tampered data, wrong key)
 */
export function decryptTaxId(cipherText: string): string {
  const key = getEncryptionKey();

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivB64, authTagB64, encrypted] = parts;

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask a Tax ID for display (e.g., "123-45-6789" -> "***-**-6789")
 * Shows only the last 4 digits
 *
 * @param taxId - The Tax ID to mask (can be plain or already masked)
 * @returns Masked Tax ID string
 */
export function maskTaxId(taxId: string): string {
  if (!taxId || taxId.length < 4) {
    return "****";
  }

  const lastFour = taxId.slice(-4);
  return `***-**-${lastFour}`;
}

// =============================================================================
// TIN Encryption Functions (Story 11.1)
// =============================================================================
// These functions use a separate key (TIN_ENCRYPTION_KEY) and a different format
// for enhanced security of Tax Identification Numbers for 1099 reporting.

const TIN_IV_LENGTH = 16; // 128-bit IV for TIN encryption
const TIN_KEY_LENGTH = 32; // 256-bit key

/**
 * Get the TIN encryption key from environment variable
 *
 * The key must be:
 * - Stored in TIN_ENCRYPTION_KEY environment variable
 * - A 64-character hex string (32 bytes when decoded)
 * - Generated securely (e.g., `openssl rand -hex 32`)
 *
 * @returns Buffer containing the 32-byte encryption key
 * @throws Error if key is not set or invalid length
 */
function getTINEncryptionKey(): Buffer {
  const keyHex = process.env.TIN_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      "TIN_ENCRYPTION_KEY environment variable is not set. " +
        "Generate a 32-byte hex key: openssl rand -hex 32",
    );
  }

  const key = Buffer.from(keyHex, "hex");

  if (key.length !== TIN_KEY_LENGTH) {
    throw new Error(
      `TIN_ENCRYPTION_KEY must be ${TIN_KEY_LENGTH * 2} hex characters (${TIN_KEY_LENGTH} bytes). ` +
        `Got ${keyHex.length} characters. Generate with: openssl rand -hex 32`,
    );
  }

  return key;
}

/**
 * Encrypt a TIN (Tax Identification Number) using AES-256-GCM
 *
 * Story 11.1 - AC-11.1.4: TIN Encryption and Security
 *
 * The ciphertext format is: base64(IV + encrypted_data + authTag)
 * - IV: 16 bytes (randomly generated for each encryption)
 * - encrypted_data: variable length
 * - authTag: 16 bytes (authentication tag from GCM)
 *
 * @param plaintext - The TIN value to encrypt (SSN or EIN format)
 * @returns Base64-encoded ciphertext containing IV, encrypted data, and auth tag
 * @throws Error if TIN_ENCRYPTION_KEY is not set or invalid
 *
 * @example
 * const encrypted = encryptTIN("123-45-6789");
 * // Returns: "base64EncodedCiphertext..."
 */
export function encryptTIN(plaintext: string): string {
  const key = getTINEncryptionKey();
  const iv = randomBytes(TIN_IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted data + authTag into a single buffer
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

/**
 * Decrypt a TIN (Tax Identification Number) using AES-256-GCM
 *
 * Story 11.1 - AC-11.1.4: TIN Encryption and Security
 *
 * Expects ciphertext in format: base64(IV + encrypted_data + authTag)
 *
 * @param ciphertext - Base64-encoded ciphertext from encryptTIN
 * @returns The original plaintext TIN value
 * @throws Error if TIN_ENCRYPTION_KEY is not set
 * @throws Error if ciphertext is tampered or corrupted
 * @throws Error if ciphertext format is invalid
 *
 * @example
 * const decrypted = decryptTIN(encryptedValue);
 * // Returns: "123-45-6789"
 */
export function decryptTIN(ciphertext: string): string {
  const key = getTINEncryptionKey();

  // Decode base64 to buffer
  const combined = Buffer.from(ciphertext, "base64");

  // Validate minimum length: IV (16) + at least 1 byte encrypted + authTag (16)
  if (combined.length < TIN_IV_LENGTH + 1 + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }

  // Extract components
  const iv = combined.subarray(0, TIN_IV_LENGTH);
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(TIN_IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
