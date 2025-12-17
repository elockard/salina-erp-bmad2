/**
 * Amazon Selling Partner API Client
 *
 * Story 17.1 - AC3: Connection Testing
 *
 * Uses AWS Signature Version 4 for authentication.
 * Reference: https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
 */

import { createHash, createHmac } from "node:crypto";
import type { AmazonMarketplaceCode } from "./schema";

export interface AmazonCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  marketplaceId: string;
  region: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  sellerName?: string;
  marketplaceName?: string;
}

/**
 * Get AWS region from marketplace
 */
export function getRegionForMarketplace(code: AmazonMarketplaceCode): string {
  const regionMap: Record<AmazonMarketplaceCode, string> = {
    US: "us-east-1",
    CA: "us-east-1",
    UK: "eu-west-1",
    DE: "eu-west-1",
    FR: "eu-west-1",
    ES: "eu-west-1",
    IT: "eu-west-1",
    JP: "us-west-2",
    AU: "us-west-2",
  };
  return regionMap[code];
}

/**
 * Get SP-API endpoint for region
 * Story 17.2: Exported for use by feeds-api-client.ts
 */
export function getEndpointForRegion(region: string): string {
  const endpoints: Record<string, string> = {
    "us-east-1": "https://sellingpartnerapi-na.amazon.com",
    "eu-west-1": "https://sellingpartnerapi-eu.amazon.com",
    "us-west-2": "https://sellingpartnerapi-fe.amazon.com",
  };
  return endpoints[region] || endpoints["us-east-1"];
}

/**
 * Create AWS Signature Version 4 authorization header
 * Story 17.2: Exported for use by feeds-api-client.ts
 */
export function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: string,
  credentials: AmazonCredentials,
  timestamp: Date,
): string {
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "execute-api";
  const region = credentials.region;

  // Create canonical request
  const canonicalUri = url.pathname;
  const canonicalQuerystring = url.search.slice(1);
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = `${sortedHeaders
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join("\n")}\n`;
  const signedHeaders = sortedHeaders.map((k) => k.toLowerCase()).join(";");
  const payloadHash = createHash("sha256").update(body).digest("hex");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  // Calculate signature
  const getSignatureKey = (
    key: string,
    dateStamp: string,
    region: string,
    service: string,
  ) => {
    const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  };

  const signingKey = getSignatureKey(
    credentials.secretAccessKey,
    dateStamp,
    region,
    service,
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Test Amazon SP-API connection
 *
 * Story 17.1 - AC3: Connection Testing
 * - Attempts API authentication
 * - Returns success with account info or error message
 * - 15-second timeout per AC3
 */
export async function testAmazonConnection(
  credentials: AmazonCredentials,
): Promise<ConnectionTestResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/sellers/v1/marketplaceParticipations";
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": createHash("sha256").update("").digest("hex"),
  };

  const authorization = signRequest(
    "GET",
    url,
    headers,
    "",
    credentials,
    timestamp,
  );

  try {
    const controller = new AbortController();
    // AC3: connection test has 15-second timeout
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...headers,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Extract marketplace participation info
      const marketplace = data.payload?.find(
        (p: { marketplace: { id: string } }) =>
          p.marketplace.id === credentials.marketplaceId,
      );

      return {
        success: true,
        message: "Connection successful",
        sellerName: marketplace?.seller?.sellerName || "Unknown Seller",
        marketplaceName:
          marketplace?.marketplace?.name || "Unknown Marketplace",
      };
    } else {
      const errorBody = await response.text();
      return {
        success: false,
        message: `API Error ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          message: "Connection timed out after 15 seconds",
        };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Unknown connection error" };
  }
}
