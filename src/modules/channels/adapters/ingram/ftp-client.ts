import { Client } from "basic-ftp";
import type { ConnectionTestResult, IngramCredentials } from "./types";

/**
 * Ingram FTP Client
 *
 * Story 16.1 - AC2: Connection Testing
 * Provides FTPS connection functionality to Ingram Content Group.
 */

/**
 * Test connection to Ingram FTPS server
 *
 * AC2: Connection Testing
 * - Attempts FTPS connection with 10-second timeout
 * - Verifies access by listing the /inbound/ directory
 * - Returns success/failure with descriptive message
 *
 * @param credentials - Ingram FTP credentials
 * @returns Connection test result with success flag and message
 */
export async function testIngramConnection(
  credentials: IngramCredentials,
): Promise<ConnectionTestResult> {
  const client = new Client(10000); // 10 second timeout per AC2

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true, // FTPS (FTP over TLS)
      secureOptions: { rejectUnauthorized: true },
    });

    // Try to list inbound directory to verify access
    await client.list("/inbound/");

    return {
      success: true,
      message: "Connection successful - verified /inbound/ directory access",
    };
  } catch (error) {
    // Provide user-friendly error messages
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for common error types
    if (errorMessage.includes("ENOTFOUND")) {
      return {
        success: false,
        message: `Host not found: ${credentials.host}. Please verify the hostname.`,
      };
    }

    if (errorMessage.includes("ECONNREFUSED")) {
      return {
        success: false,
        message: `Connection refused on port ${credentials.port}. Please verify the port number.`,
      };
    }

    if (errorMessage.includes("timeout")) {
      return {
        success: false,
        message:
          "Connection timed out after 10 seconds. Please check your network connection.",
      };
    }

    if (
      errorMessage.includes("530") ||
      errorMessage.includes("Login incorrect")
    ) {
      return {
        success: false,
        message:
          "Authentication failed. Please verify your username and password.",
      };
    }

    if (errorMessage.includes("550") || errorMessage.includes("No such file")) {
      return {
        success: false,
        message:
          "Connected successfully, but /inbound/ directory not found. Please contact Ingram support.",
      };
    }

    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
    };
  } finally {
    client.close();
  }
}

/**
 * Upload a file to Ingram's inbound directory
 *
 * Used by Story 16.2 for automated ONIX feed delivery.
 * This function is exported for future use but not implemented in Story 16.1.
 *
 * @param credentials - Ingram FTP credentials
 * @param localPath - Local file path to upload
 * @param remotePath - Remote path (relative to /inbound/)
 * @returns Upload result with success flag and message
 */
export async function uploadToIngram(
  credentials: IngramCredentials,
  localPath: string,
  remotePath: string,
): Promise<ConnectionTestResult> {
  const client = new Client(60000); // 60 second timeout for uploads

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    await client.uploadFrom(localPath, `/inbound/${remotePath}`);

    return {
      success: true,
      message: `Successfully uploaded ${remotePath} to Ingram`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Upload failed",
    };
  } finally {
    client.close();
  }
}

/**
 * List files in Ingram's outbound orders directory
 *
 * Story 16.3 - AC1: Download Order Files from FTP
 * Lists order files available for download, optionally filtering by modification date.
 *
 * @param credentials - Ingram FTP credentials
 * @param since - Optional date to filter files modified after this time
 * @returns Array of file metadata (name, modifiedAt, size)
 */
export async function listIngramOrderFiles(
  credentials: IngramCredentials,
  since?: Date,
): Promise<{ name: string; modifiedAt: Date; size: number }[]> {
  const client = new Client(30000); // 30 second timeout

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    const files = await client.list("/outbound/orders/");

    return files
      .filter((f) => f.type === 1) // Regular files only (not directories)
      .filter((f) => !since || (f.modifiedAt && f.modifiedAt > since))
      .map((f) => ({
        name: f.name,
        modifiedAt: f.modifiedAt || new Date(),
        size: f.size,
      }));
  } finally {
    client.close();
  }
}

/**
 * Download a file from Ingram's outbound orders directory
 *
 * Story 16.3 - AC1: Download Order Files from FTP
 * Downloads an order file to a local path for processing.
 *
 * @param credentials - Ingram FTP credentials
 * @param fileName - Name of the file in /outbound/orders/
 * @param localPath - Local file path to save the download
 * @returns Download result with success flag and message
 */
export async function downloadIngramOrderFile(
  credentials: IngramCredentials,
  fileName: string,
  localPath: string,
): Promise<ConnectionTestResult> {
  const client = new Client(60000); // 60 second timeout for downloads

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    await client.downloadTo(localPath, `/outbound/orders/${fileName}`);

    return {
      success: true,
      message: `Successfully downloaded ${fileName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Download failed",
    };
  } finally {
    client.close();
  }
}

/**
 * List files in Ingram's outbound inventory directory
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 * Lists inventory files available for download, optionally filtering by modification date.
 *
 * @param credentials - Ingram FTP credentials
 * @param since - Optional date to filter files modified after this time
 * @returns Array of file metadata (name, modifiedAt, size)
 */
export async function listIngramInventoryFiles(
  credentials: IngramCredentials,
  since?: Date,
): Promise<{ name: string; modifiedAt: Date; size: number }[]> {
  const client = new Client(30000); // 30 second timeout

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    const files = await client.list("/outbound/inventory/");

    return files
      .filter((f) => f.type === 1) // Regular files only (not directories)
      .filter((f) => !since || (f.modifiedAt && f.modifiedAt > since))
      .map((f) => ({
        name: f.name,
        modifiedAt: f.modifiedAt || new Date(),
        size: f.size,
      }));
  } finally {
    client.close();
  }
}

/**
 * Download a file from Ingram's outbound inventory directory
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 * Downloads an inventory file to a local path for processing.
 *
 * @param credentials - Ingram FTP credentials
 * @param fileName - Name of the file in /outbound/inventory/
 * @param localPath - Local file path to save the download
 * @returns Download result with success flag and message
 */
export async function downloadIngramInventoryFile(
  credentials: IngramCredentials,
  fileName: string,
  localPath: string,
): Promise<ConnectionTestResult> {
  const client = new Client(60000); // 60 second timeout for downloads

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    await client.downloadTo(localPath, `/outbound/inventory/${fileName}`);

    return {
      success: true,
      message: `Successfully downloaded ${fileName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Download failed",
    };
  } finally {
    client.close();
  }
}
