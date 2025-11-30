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
