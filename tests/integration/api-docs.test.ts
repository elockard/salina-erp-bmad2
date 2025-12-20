/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("API Documentation Routes", () => {
  describe("OpenAPI Spec Route (/api/openapi.yaml)", () => {
    let specContent: string;
    let parsedSpec: Record<string, unknown>;

    beforeAll(() => {
      // Read the spec file directly for comparison
      const specPath = join(process.cwd(), "src/modules/api/openapi/spec.yaml");
      specContent = readFileSync(specPath, "utf-8");
      parsedSpec = parse(specContent);
    });

    it("should have valid YAML content", () => {
      expect(() => parse(specContent)).not.toThrow();
    });

    it("should contain required OpenAPI 3.0 fields", () => {
      expect(parsedSpec).toHaveProperty("openapi");
      expect(parsedSpec).toHaveProperty("info");
      expect(parsedSpec).toHaveProperty("paths");
      expect(parsedSpec.openapi).toMatch(/^3\.0/);
    });

    it("should have proper API info", () => {
      const info = parsedSpec.info as Record<string, unknown>;
      expect(info.title).toBe("Salina ERP API");
      expect(info.version).toBe("1.0.0");
      expect(info.description).toBeDefined();
    });

    it("should define security schemes", () => {
      const components = parsedSpec.components as Record<string, unknown>;
      const securitySchemes = components?.securitySchemes as Record<
        string,
        unknown
      >;
      expect(securitySchemes).toBeDefined();
      expect(securitySchemes.bearerAuth).toBeDefined();
    });

    it("should have authentication endpoints", () => {
      const paths = parsedSpec.paths as Record<string, unknown>;
      expect(paths["/auth/token"]).toBeDefined();
    });

    it("should have webhook endpoints", () => {
      const paths = parsedSpec.paths as Record<string, unknown>;
      expect(paths["/webhooks"]).toBeDefined();
      expect(paths["/webhooks/{id}"]).toBeDefined();
      expect(paths["/webhooks/{id}/secret"]).toBeDefined();
    });

    it("should document rate limiting in responses", () => {
      const paths = parsedSpec.paths as Record<string, unknown>;
      const titlesGet = paths["/titles"] as Record<string, unknown>;
      const getOperation = titlesGet?.get as Record<string, unknown>;
      const responses = getOperation?.responses as Record<string, unknown>;

      // Should have 429 response for rate limiting
      expect(responses?.["429"]).toBeDefined();
    });

    it("should have proper error response schemas", () => {
      const components = parsedSpec.components as Record<string, unknown>;
      const schemas = components?.schemas as Record<string, unknown>;

      expect(schemas?.Error).toBeDefined();
      expect(schemas?.TokenResponse).toBeDefined();
      expect(schemas?.Pagination).toBeDefined();
    });
  });

  describe("API Documentation Guide Files", () => {
    it("should have authentication guide", () => {
      const guidePath = join(
        process.cwd(),
        "src/modules/api/openapi/authentication-guide.md",
      );
      const content = readFileSync(guidePath, "utf-8");

      expect(content).toContain("OAuth 2.0");
      expect(content).toContain("client_credentials");
      expect(content).toContain("scope");
    });

    it("should have webhooks guide", () => {
      const guidePath = join(
        process.cwd(),
        "src/modules/api/openapi/webhooks-guide.md",
      );
      const content = readFileSync(guidePath, "utf-8");

      expect(content).toContain("HMAC-SHA256");
      expect(content).toContain("X-Webhook-Signature");
      expect(content).toContain("retry");
    });

    it("should have rate limits guide", () => {
      const guidePath = join(
        process.cwd(),
        "src/modules/api/openapi/rate-limits-guide.md",
      );
      const content = readFileSync(guidePath, "utf-8");

      expect(content).toContain("100");
      expect(content).toContain("1000");
      expect(content).toContain("429");
    });

    it("should have changelog", () => {
      const changelogPath = join(
        process.cwd(),
        "src/modules/api/openapi/changelog.md",
      );
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("1.0.0");
      expect(content).toContain("Initial Release");
    });
  });

  describe("API Docs Page Component", () => {
    it("should have api-docs page file", () => {
      const pagePath = join(process.cwd(), "src/app/api-docs/page.tsx");
      const content = readFileSync(pagePath, "utf-8");

      expect(content).toContain("ApiReferenceReact");
      expect(content).toContain("@scalar/api-reference-react");
      expect(content).toContain("/api/openapi.yaml");
    });

    it("should configure Scalar with dark mode and theme", () => {
      const pagePath = join(process.cwd(), "src/app/api-docs/page.tsx");
      const content = readFileSync(pagePath, "utf-8");

      expect(content).toContain("darkMode: true");
      expect(content).toContain('theme: "purple"');
      expect(content).toContain("showSidebar: true");
    });

    it("should configure bearer auth as preferred scheme", () => {
      const pagePath = join(process.cwd(), "src/app/api-docs/page.tsx");
      const content = readFileSync(pagePath, "utf-8");

      expect(content).toContain("preferredSecurityScheme");
      expect(content).toContain("bearerAuth");
    });
  });

  describe("OpenAPI Route Handler", () => {
    it("should have route handler file", () => {
      const routePath = join(
        process.cwd(),
        "src/app/api/openapi.yaml/route.ts",
      );
      const content = readFileSync(routePath, "utf-8");

      expect(content).toContain("NextResponse");
      expect(content).toContain("application/yaml");
      expect(content).toContain('runtime = "nodejs"');
    });

    it("should read spec from correct path", () => {
      const routePath = join(
        process.cwd(),
        "src/app/api/openapi.yaml/route.ts",
      );
      const content = readFileSync(routePath, "utf-8");

      expect(content).toContain("src/modules/api/openapi/spec.yaml");
    });

    it("should have error handling for missing files", () => {
      const routePath = join(
        process.cwd(),
        "src/app/api/openapi.yaml/route.ts",
      );
      const content = readFileSync(routePath, "utf-8");

      expect(content).toContain("existsSync");
      expect(content).toContain("try");
      expect(content).toContain("catch");
      expect(content).toContain("status: 404");
      expect(content).toContain("status: 500");
    });

    it("should set cache headers", () => {
      const routePath = join(
        process.cwd(),
        "src/app/api/openapi.yaml/route.ts",
      );
      const content = readFileSync(routePath, "utf-8");

      expect(content).toContain("Cache-Control");
    });
  });
});
