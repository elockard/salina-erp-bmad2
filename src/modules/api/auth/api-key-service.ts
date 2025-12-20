/**
 * API Key Generation Service
 *
 * Story 15.1 - AC1: API Key Generation
 * Story 15.1 - AC6: Secure Storage
 *
 * Security:
 * - Secret is bcrypt hashed with cost factor 12 (never stored plaintext)
 * - Key ID format: sk_live_xxx or sk_test_xxx (20 alphanumeric chars)
 * - Secret: 40 cryptographically random alphanumeric characters
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const KEY_ID_LENGTH = 20;
const SECRET_LENGTH = 40;
// Request more random bytes than needed since base64 filtering reduces output
// base64 encoding produces ~1.33x output, filtering removes ~25% non-alphanumeric
// Request 2x to ensure we always have enough characters
const RANDOM_BYTES_MULTIPLIER = 2;

/**
 * Generate API key pair
 *
 * Story 15.1 - AC1: API Key Generation
 *
 * @returns Key ID (sk_live_xxx), plaintext secret (shown once), hashed secret (stored)
 */
export async function generateApiKeyPair(isTest: boolean = false): Promise<{
  keyId: string;
  plaintextSecret: string;
  secretHash: string;
}> {
  const prefix = isTest ? "sk_test_" : "sk_live_";

  // Generate cryptographically random key ID (alphanumeric)
  // Use multiplier to ensure enough entropy after base64 filtering
  const keyIdRandom = randomBytes(KEY_ID_LENGTH * RANDOM_BYTES_MULTIPLIER)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, KEY_ID_LENGTH);
  const keyId = `${prefix}${keyIdRandom}`;

  // Generate cryptographically random secret
  // Use multiplier to ensure enough entropy after base64 filtering
  const plaintextSecret = randomBytes(SECRET_LENGTH * RANDOM_BYTES_MULTIPLIER)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, SECRET_LENGTH);

  // Hash secret with bcrypt
  const secretHash = await bcrypt.hash(plaintextSecret, BCRYPT_COST);

  return { keyId, plaintextSecret, secretHash };
}

/**
 * Verify API secret against stored hash
 *
 * Story 15.1 - AC3: Token Endpoint validation
 */
export async function verifyApiSecret(
  plaintextSecret: string,
  secretHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintextSecret, secretHash);
}
