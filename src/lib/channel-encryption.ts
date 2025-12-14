/**
 * Channel Credentials Encryption Utility
 *
 * Provides AES-256-GCM encryption for distribution channel credentials (Ingram, Amazon, etc.)
 * Uses Node.js built-in crypto module.
 *
 * Story 16.1 - AC4: Secure Storage
 * - Credentials encrypted at rest using AES-256-GCM
 * - Follows the same pattern as TIN encryption in src/lib/encryption.ts
 *
 * Environment Variable Required:
 * - CHANNEL_CREDENTIALS_KEY: 32-byte hex string (64 hex characters)
 *   Generate with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

/**
 * Get the channel credentials encryption key from environment variable
 *
 * The key must be:
 * - Stored in CHANNEL_CREDENTIALS_KEY environment variable
 * - A 64-character hex string (32 bytes when decoded)
 * - Generated securely (e.g., `openssl rand -hex 32`)
 *
 * @returns Buffer containing the 32-byte encryption key
 * @throws Error if key is not set or invalid length
 */
function getChannelEncryptionKey(): Buffer {
  const keyHex = process.env.CHANNEL_CREDENTIALS_KEY;

  if (!keyHex) {
    throw new Error(
      "CHANNEL_CREDENTIALS_KEY environment variable is not set. " +
        "Generate a 32-byte hex key: openssl rand -hex 32",
    );
  }

  const key = Buffer.from(keyHex, "hex");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CHANNEL_CREDENTIALS_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
        `Got ${keyHex.length} characters. Generate with: openssl rand -hex 32`,
    );
  }

  return key;
}

/**
 * Encrypt channel credentials using AES-256-GCM
 *
 * Story 16.1 - AC4: Secure Storage
 *
 * The ciphertext format is: base64(IV + encrypted_data + authTag)
 * - IV: 16 bytes (randomly generated for each encryption)
 * - encrypted_data: variable length
 * - authTag: 16 bytes (authentication tag from GCM)
 *
 * @param plaintext - The credentials JSON string to encrypt
 * @returns Base64-encoded ciphertext containing IV, encrypted data, and auth tag
 * @throws Error if CHANNEL_CREDENTIALS_KEY is not set or invalid
 *
 * @example
 * const encrypted = encryptCredentials(JSON.stringify({
 *   host: "ftps.ingramcontent.com",
 *   username: "user",
 *   password: "pass",
 *   port: 990
 * }));
 */
export function encryptCredentials(plaintext: string): string {
  const key = getChannelEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted data + authTag into a single buffer
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

/**
 * Decrypt channel credentials using AES-256-GCM
 *
 * Story 16.1 - AC4: Secure Storage
 *
 * Expects ciphertext in format: base64(IV + encrypted_data + authTag)
 *
 * @param ciphertext - Base64-encoded ciphertext from encryptCredentials
 * @returns The original plaintext credentials JSON string
 * @throws Error if CHANNEL_CREDENTIALS_KEY is not set
 * @throws Error if ciphertext is tampered or corrupted
 * @throws Error if ciphertext format is invalid
 *
 * @example
 * const decrypted = decryptCredentials(encryptedValue);
 * const credentials = JSON.parse(decrypted);
 */
export function decryptCredentials(ciphertext: string): string {
  const key = getChannelEncryptionKey();

  // Decode base64 to buffer
  const combined = Buffer.from(ciphertext, "base64");

  // Validate minimum length: IV (16) + at least 1 byte encrypted + authTag (16)
  if (combined.length < IV_LENGTH + 1 + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
