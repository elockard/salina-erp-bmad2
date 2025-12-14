/**
 * Ingram Adapter Unit Tests
 *
 * Story 16.1 - Configure Ingram Account Connection
 * Tests for schema validation, actions, and queries
 */

import { describe, expect, it } from "vitest";
import {
  type IngramCredentialsFormInput,
  type IngramCredentialsInput,
  ingramCredentialsFormSchema,
  ingramCredentialsSchema,
  ingramCredentialsUpdateSchema,
} from "@/modules/channels/adapters/ingram/schema";

describe("Ingram Adapter", () => {
  describe("ingramCredentialsSchema", () => {
    describe("AC1: FTP Credential Configuration", () => {
      it("should validate complete valid credentials", () => {
        const credentials: IngramCredentialsInput = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(credentials);
        }
      });

      it("should use default port 990 when not specified", () => {
        const credentials = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.port).toBe(990);
        }
      });
    });

    describe("Host Validation", () => {
      it("should require host", () => {
        const credentials = {
          username: "testuser",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject empty host", () => {
        const credentials = {
          host: "",
          username: "testuser",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("required");
        }
      });

      it("should reject host exceeding 255 characters", () => {
        const credentials = {
          host: "a".repeat(256),
          username: "testuser",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("255");
        }
      });

      it("should accept host at exactly 255 characters", () => {
        const credentials = {
          host: "a".repeat(255),
          username: "testuser",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(true);
      });
    });

    describe("Username Validation", () => {
      it("should require username", () => {
        const credentials = {
          host: "ftp.example.com",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject empty username", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "",
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("required");
        }
      });

      it("should reject username exceeding 100 characters", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "u".repeat(101),
          password: "testpass",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("100");
        }
      });
    });

    describe("Password Validation", () => {
      it("should require password", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject empty password", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "",
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("required");
        }
      });

      it("should accept long passwords", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "a".repeat(500),
          port: 990,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(true);
      });
    });

    describe("Port Validation", () => {
      it("should accept valid port numbers", () => {
        const ports = [1, 21, 22, 990, 65535];

        for (const port of ports) {
          const credentials = {
            host: "ftp.example.com",
            username: "testuser",
            password: "testpass",
            port,
          };

          const result = ingramCredentialsSchema.safeParse(credentials);
          expect(result.success).toBe(true);
        }
      });

      it("should reject port 0", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: 0,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least 1");
        }
      });

      it("should reject port above 65535", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: 65536,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("65535");
        }
      });

      it("should reject negative port", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: -1,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject non-integer port", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: 990.5,
        };

        const result = ingramCredentialsSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("ingramCredentialsFormSchema", () => {
    describe("Port as String", () => {
      it("should accept port as string and validate numeric range", () => {
        const credentials: IngramCredentialsFormInput = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
          port: "990",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(true);
      });

      it("should reject non-numeric port string", () => {
        const credentials = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
          port: "abc",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject port 0 as string", () => {
        const credentials = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
          port: "0",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should reject port above 65535 as string", () => {
        const credentials = {
          host: "ftp.ingramcontent.com",
          username: "testuser",
          password: "testpass",
          port: "65536",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should accept boundary port values as strings", () => {
        const minPort = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: "1",
        };

        const maxPort = {
          host: "ftp.example.com",
          username: "testuser",
          password: "testpass",
          port: "65535",
        };

        expect(ingramCredentialsFormSchema.safeParse(minPort).success).toBe(
          true,
        );
        expect(ingramCredentialsFormSchema.safeParse(maxPort).success).toBe(
          true,
        );
      });
    });

    describe("Other field validation matches base schema", () => {
      it("should require host", () => {
        const credentials = {
          username: "testuser",
          password: "testpass",
          port: "990",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should require username", () => {
        const credentials = {
          host: "ftp.example.com",
          password: "testpass",
          port: "990",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });

      it("should require password", () => {
        const credentials = {
          host: "ftp.example.com",
          username: "testuser",
          port: "990",
        };

        const result = ingramCredentialsFormSchema.safeParse(credentials);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Type Exports", () => {
    it("should export IngramCredentialsInput type that matches schema output", () => {
      const credentials: IngramCredentialsInput = {
        host: "ftp.example.com",
        username: "user",
        password: "pass",
        port: 990,
      };

      const result = ingramCredentialsSchema.parse(credentials);
      expect(result.host).toBe(credentials.host);
      expect(result.username).toBe(credentials.username);
      expect(result.password).toBe(credentials.password);
      expect(result.port).toBe(credentials.port);
    });

    it("should export IngramCredentialsFormInput type for form handling", () => {
      const formData: IngramCredentialsFormInput = {
        host: "ftp.example.com",
        username: "user",
        password: "pass",
        port: "990", // String in form
      };

      const result = ingramCredentialsFormSchema.parse(formData);
      expect(result.port).toBe("990"); // Stays as string
    });
  });

  describe("AC3: Credential Validation Before Save", () => {
    it("should validate all fields before allowing save", () => {
      // Complete valid credentials
      const valid = {
        host: "ftp.ingramcontent.com",
        username: "publisher_id",
        password: "secure_password_123",
        port: 990,
      };

      expect(ingramCredentialsSchema.safeParse(valid).success).toBe(true);

      // Missing any required field should fail
      const missingHost = { ...valid };
      delete (missingHost as Record<string, unknown>).host;
      expect(ingramCredentialsSchema.safeParse(missingHost).success).toBe(
        false,
      );

      const missingUser = { ...valid };
      delete (missingUser as Record<string, unknown>).username;
      expect(ingramCredentialsSchema.safeParse(missingUser).success).toBe(
        false,
      );

      const missingPass = { ...valid };
      delete (missingPass as Record<string, unknown>).password;
      expect(ingramCredentialsSchema.safeParse(missingPass).success).toBe(
        false,
      );
    });
  });

  describe("ingramCredentialsUpdateSchema (AC5)", () => {
    it("should allow optional password for updates", () => {
      const updateWithoutPassword = {
        host: "ftp.ingramcontent.com",
        username: "testuser",
        port: 990,
      };

      const result = ingramCredentialsUpdateSchema.safeParse(
        updateWithoutPassword,
      );
      expect(result.success).toBe(true);
    });

    it("should accept empty string password", () => {
      const updateWithEmptyPassword = {
        host: "ftp.ingramcontent.com",
        username: "testuser",
        password: "",
        port: 990,
      };

      const result = ingramCredentialsUpdateSchema.safeParse(
        updateWithEmptyPassword,
      );
      expect(result.success).toBe(true);
    });

    it("should accept provided password", () => {
      const updateWithPassword = {
        host: "ftp.ingramcontent.com",
        username: "testuser",
        password: "newpassword",
        port: 990,
      };

      const result =
        ingramCredentialsUpdateSchema.safeParse(updateWithPassword);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe("newpassword");
      }
    });

    it("should still require host", () => {
      const update = {
        username: "testuser",
        port: 990,
      };

      const result = ingramCredentialsUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should still require username", () => {
      const update = {
        host: "ftp.example.com",
        port: 990,
      };

      const result = ingramCredentialsUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should use default port 990 when not specified", () => {
      const update = {
        host: "ftp.ingramcontent.com",
        username: "testuser",
      };

      const result = ingramCredentialsUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(990);
      }
    });
  });

  describe("Form Schema Password Optional (AC5)", () => {
    it("should allow empty password string in form", () => {
      const formData = {
        host: "ftp.example.com",
        username: "testuser",
        password: "", // Empty for updates
        port: "990",
      };

      const result = ingramCredentialsFormSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });
  });
});
