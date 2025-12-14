import { describe, expect, it } from "vitest";
import {
  CHANNEL_STATUS,
  CHANNEL_TYPES,
  type ChannelCredential,
  type ChannelStatus,
  type ChannelType,
  channelCredentials,
  type InsertChannelCredential,
} from "@/db/schema/channel-credentials";

/**
 * Unit tests for Channel Credentials Schema
 *
 * Story 16.1 - AC4: Secure Storage
 * - Test channel_credentials table structure
 * - Test type constants for channels and statuses
 * - Test type inference for ChannelCredential
 */

describe("channelCredentials table schema structure", () => {
  it("is defined as a pgTable", () => {
    expect(channelCredentials).toBeDefined();
    expect(typeof channelCredentials).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(channelCredentials.id).toBeDefined();
    expect(channelCredentials.id.name).toBe("id");
  });

  it("has tenantId column (UUID, not null, references tenants)", () => {
    expect(channelCredentials.tenantId).toBeDefined();
    expect(channelCredentials.tenantId.name).toBe("tenant_id");
    expect(channelCredentials.tenantId.notNull).toBe(true);
  });

  it("has channel column (text, not null)", () => {
    expect(channelCredentials.channel).toBeDefined();
    expect(channelCredentials.channel.name).toBe("channel");
    expect(channelCredentials.channel.notNull).toBe(true);
  });

  it("has credentials column (text, not null) for encrypted data", () => {
    expect(channelCredentials.credentials).toBeDefined();
    expect(channelCredentials.credentials.name).toBe("credentials");
    expect(channelCredentials.credentials.notNull).toBe(true);
  });

  it("has status column (text, not null, defaults to active)", () => {
    expect(channelCredentials.status).toBeDefined();
    expect(channelCredentials.status.name).toBe("status");
    expect(channelCredentials.status.notNull).toBe(true);
    expect(channelCredentials.status.default).toBe("active");
  });

  it("has lastConnectionTest column (timestamp, nullable)", () => {
    expect(channelCredentials.lastConnectionTest).toBeDefined();
    expect(channelCredentials.lastConnectionTest.name).toBe(
      "last_connection_test",
    );
    expect(channelCredentials.lastConnectionTest.notNull).toBe(false);
  });

  it("has lastConnectionStatus column (text, nullable)", () => {
    expect(channelCredentials.lastConnectionStatus).toBeDefined();
    expect(channelCredentials.lastConnectionStatus.name).toBe(
      "last_connection_status",
    );
    expect(channelCredentials.lastConnectionStatus.notNull).toBe(false);
  });

  it("has createdAt column (timestamp, not null)", () => {
    expect(channelCredentials.createdAt).toBeDefined();
    expect(channelCredentials.createdAt.name).toBe("created_at");
    expect(channelCredentials.createdAt.notNull).toBe(true);
  });

  it("has updatedAt column (timestamp, not null)", () => {
    expect(channelCredentials.updatedAt).toBeDefined();
    expect(channelCredentials.updatedAt.name).toBe("updated_at");
    expect(channelCredentials.updatedAt.notNull).toBe(true);
  });
});

describe("CHANNEL_TYPES constants", () => {
  it("has INGRAM channel type", () => {
    expect(CHANNEL_TYPES.INGRAM).toBe("ingram");
  });

  it("has AMAZON channel type", () => {
    expect(CHANNEL_TYPES.AMAZON).toBe("amazon");
  });

  it("has exactly 2 channel types", () => {
    expect(Object.keys(CHANNEL_TYPES)).toHaveLength(2);
  });
});

describe("ChannelType type", () => {
  it("accepts valid channel types", () => {
    const ingram: ChannelType = "ingram";
    const amazon: ChannelType = "amazon";

    expect(ingram).toBe("ingram");
    expect(amazon).toBe("amazon");
  });
});

describe("CHANNEL_STATUS constants", () => {
  it("has ACTIVE status", () => {
    expect(CHANNEL_STATUS.ACTIVE).toBe("active");
  });

  it("has ERROR status", () => {
    expect(CHANNEL_STATUS.ERROR).toBe("error");
  });

  it("has DISCONNECTED status", () => {
    expect(CHANNEL_STATUS.DISCONNECTED).toBe("disconnected");
  });

  it("has exactly 3 status values", () => {
    expect(Object.keys(CHANNEL_STATUS)).toHaveLength(3);
  });
});

describe("ChannelStatus type", () => {
  it("accepts valid status values", () => {
    const active: ChannelStatus = "active";
    const error: ChannelStatus = "error";
    const disconnected: ChannelStatus = "disconnected";

    expect(active).toBe("active");
    expect(error).toBe("error");
    expect(disconnected).toBe("disconnected");
  });
});

describe("ChannelCredential type", () => {
  it("infers select type from channelCredentials table", () => {
    const mockCredential: ChannelCredential = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "ingram",
      credentials: "encryptedJsonBlob",
      status: "active",
      metadata: null,
      lastConnectionTest: new Date(),
      lastConnectionStatus: "Connection successful",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockCredential.id).toBeDefined();
    expect(mockCredential.channel).toBe("ingram");
    expect(mockCredential.status).toBe("active");
  });

  it("supports null for optional fields", () => {
    const mockCredential: ChannelCredential = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "amazon",
      credentials: "encryptedJsonBlob",
      status: "disconnected",
      metadata: null,
      lastConnectionTest: null,
      lastConnectionStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockCredential.lastConnectionTest).toBeNull();
    expect(mockCredential.lastConnectionStatus).toBeNull();
  });
});

describe("InsertChannelCredential type", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertChannelCredential = {
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "ingram",
      credentials: "encryptedJsonBlob",
      // id is optional - will be auto-generated
    };

    expect(insertData.tenantId).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional status with default", () => {
    const insertData: InsertChannelCredential = {
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "ingram",
      credentials: "encryptedJsonBlob",
      // status defaults to "active"
    };

    expect(insertData.status).toBeUndefined();
  });

  it("allows explicit status value", () => {
    const insertData: InsertChannelCredential = {
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "ingram",
      credentials: "encryptedJsonBlob",
      status: "error",
    };

    expect(insertData.status).toBe("error");
  });

  it("allows optional lastConnectionTest and lastConnectionStatus", () => {
    const insertData: InsertChannelCredential = {
      tenantId: "660e8400-e29b-41d4-a716-446655440000",
      channel: "ingram",
      credentials: "encryptedJsonBlob",
      lastConnectionTest: new Date(),
      lastConnectionStatus: "Connection successful",
    };

    expect(insertData.lastConnectionTest).toBeDefined();
    expect(insertData.lastConnectionStatus).toBe("Connection successful");
  });
});

describe("Default value verification (AC4)", () => {
  it("status should default to active", () => {
    expect(channelCredentials.status.default).toBe("active");
  });
});
