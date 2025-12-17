import { describe, expect, it } from "vitest";
import {
  AMAZON_MARKETPLACES,
  AMAZON_PROGRAM_TYPES,
  type AmazonCredentialsFormInput,
  type AmazonCredentialsInput,
  type AmazonMarketplaceCode,
  type AmazonProgramType,
  type AmazonStoredCredentials,
  amazonCredentialsFormSchema,
  amazonCredentialsSchema,
} from "@/modules/channels/adapters/amazon/schema";

/**
 * Unit tests for Amazon Credential Schema
 *
 * Story 17.1 - AC1: Amazon Account Type Selection
 * Story 17.1 - AC2: API Credential Configuration
 * Story 17.1 - AC4: Credential Validation
 */

describe("AMAZON_PROGRAM_TYPES constants", () => {
  it("has KDP program type", () => {
    expect(AMAZON_PROGRAM_TYPES.KDP).toBe("kdp");
  });

  it("has ADVANTAGE program type", () => {
    expect(AMAZON_PROGRAM_TYPES.ADVANTAGE).toBe("advantage");
  });

  it("has exactly 2 program types", () => {
    expect(Object.keys(AMAZON_PROGRAM_TYPES)).toHaveLength(2);
  });
});

describe("AmazonProgramType type", () => {
  it("accepts valid program types", () => {
    const kdp: AmazonProgramType = "kdp";
    const advantage: AmazonProgramType = "advantage";

    expect(kdp).toBe("kdp");
    expect(advantage).toBe("advantage");
  });
});

describe("AMAZON_MARKETPLACES constants", () => {
  it("has US marketplace with correct ID", () => {
    expect(AMAZON_MARKETPLACES.US).toEqual({
      id: "ATVPDKIKX0DER",
      name: "United States",
      code: "US",
    });
  });

  it("has UK marketplace with correct ID", () => {
    expect(AMAZON_MARKETPLACES.UK).toEqual({
      id: "A1F83G8C2ARO7P",
      name: "United Kingdom",
      code: "UK",
    });
  });

  it("has all 9 supported marketplaces", () => {
    const expectedMarketplaces = [
      "US",
      "CA",
      "UK",
      "DE",
      "FR",
      "ES",
      "IT",
      "JP",
      "AU",
    ];
    expect(Object.keys(AMAZON_MARKETPLACES)).toEqual(expectedMarketplaces);
    expect(Object.keys(AMAZON_MARKETPLACES)).toHaveLength(9);
  });

  it("each marketplace has id, name, and code", () => {
    Object.entries(AMAZON_MARKETPLACES).forEach(([code, marketplace]) => {
      expect(marketplace.id).toBeDefined();
      expect(marketplace.name).toBeDefined();
      expect(marketplace.code).toBe(code);
    });
  });
});

describe("AmazonMarketplaceCode type", () => {
  it("accepts valid marketplace codes", () => {
    const us: AmazonMarketplaceCode = "US";
    const uk: AmazonMarketplaceCode = "UK";
    const jp: AmazonMarketplaceCode = "JP";

    expect(us).toBe("US");
    expect(uk).toBe("UK");
    expect(jp).toBe("JP");
  });
});

describe("amazonCredentialsSchema validation (AC4)", () => {
  const validKdpCredentials: AmazonCredentialsInput = {
    programType: "kdp",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    marketplace: "US",
  };

  const validAdvantageCredentials: AmazonCredentialsInput = {
    programType: "advantage",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    marketplace: "UK",
  };

  describe("valid credentials", () => {
    it("accepts valid KDP credentials", () => {
      const result = amazonCredentialsSchema.safeParse(validKdpCredentials);
      expect(result.success).toBe(true);
    });

    it("accepts valid Advantage credentials", () => {
      const result = amazonCredentialsSchema.safeParse(
        validAdvantageCredentials,
      );
      expect(result.success).toBe(true);
    });

    it("accepts credentials with optional LWA fields", () => {
      const credentialsWithLwa = {
        ...validKdpCredentials,
        lwaClientId: "amzn1.application-oa2-client.example",
        lwaClientSecret: "exampleSecret",
        refreshToken: "Atzr|IwEBIJedGXjLBrFK...",
      };
      const result = amazonCredentialsSchema.safeParse(credentialsWithLwa);
      expect(result.success).toBe(true);
    });

    it("accepts all valid marketplace codes", () => {
      const marketplaces = [
        "US",
        "CA",
        "UK",
        "DE",
        "FR",
        "ES",
        "IT",
        "JP",
        "AU",
      ];
      marketplaces.forEach((marketplace) => {
        const result = amazonCredentialsSchema.safeParse({
          ...validKdpCredentials,
          marketplace,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("invalid credentials", () => {
    it("rejects missing program type", () => {
      const { programType: _programType, ...withoutProgram } =
        validKdpCredentials;
      const result = amazonCredentialsSchema.safeParse(withoutProgram);
      expect(result.success).toBe(false);
    });

    it("rejects invalid program type", () => {
      const result = amazonCredentialsSchema.safeParse({
        ...validKdpCredentials,
        programType: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing access key ID", () => {
      const { accessKeyId: _accessKeyId, ...withoutAccessKey } =
        validKdpCredentials;
      const result = amazonCredentialsSchema.safeParse(withoutAccessKey);
      expect(result.success).toBe(false);
    });

    it("rejects access key ID that is too short", () => {
      const result = amazonCredentialsSchema.safeParse({
        ...validKdpCredentials,
        accessKeyId: "SHORT",
      });
      expect(result.success).toBe(false);
    });

    it("rejects access key ID with invalid characters (must be uppercase alphanumeric)", () => {
      const result = amazonCredentialsSchema.safeParse({
        ...validKdpCredentials,
        accessKeyId: "akiaiosfodnn7example", // lowercase
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing secret access key", () => {
      const { secretAccessKey: _secretAccessKey, ...withoutSecret } =
        validKdpCredentials;
      const result = amazonCredentialsSchema.safeParse(withoutSecret);
      expect(result.success).toBe(false);
    });

    it("rejects empty secret access key", () => {
      const result = amazonCredentialsSchema.safeParse({
        ...validKdpCredentials,
        secretAccessKey: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing marketplace", () => {
      const { marketplace: _marketplace, ...withoutMarketplace } =
        validKdpCredentials;
      const result = amazonCredentialsSchema.safeParse(withoutMarketplace);
      expect(result.success).toBe(false);
    });

    it("rejects invalid marketplace", () => {
      const result = amazonCredentialsSchema.safeParse({
        ...validKdpCredentials,
        marketplace: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("AmazonCredentialsInput type", () => {
  it("has correct shape from schema inference", () => {
    const input: AmazonCredentialsInput = {
      programType: "kdp",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "secret",
      marketplace: "US",
    };

    expect(input.programType).toBe("kdp");
    expect(input.accessKeyId).toBeDefined();
    expect(input.secretAccessKey).toBeDefined();
    expect(input.marketplace).toBe("US");
  });

  it("supports optional LWA fields", () => {
    const input: AmazonCredentialsInput = {
      programType: "advantage",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "secret",
      marketplace: "DE",
      lwaClientId: "client-id",
      lwaClientSecret: "client-secret",
      refreshToken: "refresh-token",
    };

    expect(input.lwaClientId).toBe("client-id");
    expect(input.lwaClientSecret).toBe("client-secret");
    expect(input.refreshToken).toBe("refresh-token");
  });
});

describe("AmazonStoredCredentials interface", () => {
  it("has correct structure for encrypted storage", () => {
    const stored: AmazonStoredCredentials = {
      programType: "kdp",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "secret",
      marketplaceId: "ATVPDKIKX0DER",
      marketplaceCode: "US",
    };

    expect(stored.programType).toBe("kdp");
    expect(stored.marketplaceId).toBe("ATVPDKIKX0DER");
    expect(stored.marketplaceCode).toBe("US");
  });

  it("supports optional LWA fields in stored credentials", () => {
    const stored: AmazonStoredCredentials = {
      programType: "advantage",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "secret",
      marketplaceId: "A1F83G8C2ARO7P",
      marketplaceCode: "UK",
      lwaClientId: "client-id",
      lwaClientSecret: "client-secret",
      refreshToken: "refresh-token",
    };

    expect(stored.lwaClientId).toBe("client-id");
    expect(stored.lwaClientSecret).toBe("client-secret");
    expect(stored.refreshToken).toBe("refresh-token");
  });
});

/**
 * Tests for amazonCredentialsFormSchema (AC6 - Edit mode)
 * This schema allows empty secretAccessKey for updates
 */
describe("amazonCredentialsFormSchema (AC6 edit mode)", () => {
  const validFormCredentials: AmazonCredentialsFormInput = {
    programType: "kdp",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "someSecret",
    marketplace: "US",
  };

  it("accepts valid credentials with secret", () => {
    const result = amazonCredentialsFormSchema.safeParse(validFormCredentials);
    expect(result.success).toBe(true);
  });

  it("accepts empty secretAccessKey for edit mode (AC6)", () => {
    const editModeCredentials = {
      ...validFormCredentials,
      secretAccessKey: "", // Empty for edit mode - keeps existing
    };
    const result = amazonCredentialsFormSchema.safeParse(editModeCredentials);
    expect(result.success).toBe(true);
  });

  it("still validates other required fields even with empty secret", () => {
    const invalidCredentials = {
      programType: "kdp",
      accessKeyId: "SHORT", // Too short
      secretAccessKey: "",
      marketplace: "US",
    };
    const result = amazonCredentialsFormSchema.safeParse(invalidCredentials);
    expect(result.success).toBe(false);
  });

  it("rejects invalid program type", () => {
    const result = amazonCredentialsFormSchema.safeParse({
      ...validFormCredentials,
      programType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid marketplace", () => {
    const result = amazonCredentialsFormSchema.safeParse({
      ...validFormCredentials,
      marketplace: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
