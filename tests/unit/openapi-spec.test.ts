/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("OpenAPI Specification", () => {
  const specPath = join(process.cwd(), "src/modules/api/openapi/spec.yaml");
  const specContent = readFileSync(specPath, "utf-8");
  const spec = parse(specContent);

  it("has valid OpenAPI version", () => {
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
  });

  it("has required info fields", () => {
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBeDefined();
    expect(spec.info.description).toBeDefined();
  });

  it("documents all v1 endpoints", () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/auth/token");
    expect(paths).toContain("/titles");
    expect(paths).toContain("/titles/{id}");
    expect(paths).toContain("/contacts");
    expect(paths).toContain("/contacts/{id}");
    expect(paths).toContain("/sales");
    expect(paths).toContain("/sales/{id}");
    expect(paths).toContain("/onix/export");
    expect(paths).toContain("/webhooks");
    expect(paths).toContain("/webhooks/{id}");
    expect(paths).toContain("/webhooks/{id}/test");
    expect(paths).toContain("/webhooks/{id}/deliveries");
    expect(paths).toContain("/webhooks/{id}/secret");
    expect(paths).toContain("/webhooks/deliveries/{deliveryId}");
  });

  it("defines security scheme", () => {
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  it("defines error response schemas", () => {
    expect(spec.components.schemas.Error).toBeDefined();
    expect(spec.components.responses.Unauthorized).toBeDefined();
    expect(spec.components.responses.ValidationError).toBeDefined();
    expect(spec.components.responses.RateLimited).toBeDefined();
    expect(spec.components.responses.NotFound).toBeDefined();
    expect(spec.components.responses.Forbidden).toBeDefined();
  });

  it("defines all resource schemas", () => {
    expect(spec.components.schemas.Title).toBeDefined();
    expect(spec.components.schemas.TitleCreate).toBeDefined();
    expect(spec.components.schemas.TitleUpdate).toBeDefined();
    expect(spec.components.schemas.Contact).toBeDefined();
    expect(spec.components.schemas.ContactCreate).toBeDefined();
    expect(spec.components.schemas.Sale).toBeDefined();
    expect(spec.components.schemas.SaleCreate).toBeDefined();
    expect(spec.components.schemas.Webhook).toBeDefined();
    expect(spec.components.schemas.WebhookCreate).toBeDefined();
    expect(spec.components.schemas.WebhookDelivery).toBeDefined();
  });

  it("has correct token expiry (15 minutes)", () => {
    expect(spec.components.schemas.TokenResponse.example.expires_in).toBe(900);
  });

  it("documents admin scope for webhooks", () => {
    const webhookPost = spec.paths["/webhooks"].post;
    expect(webhookPost.description).toContain("admin");
  });

  it("has server configuration", () => {
    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.servers[0].url).toContain("/api/v1");
  });

  it("defines pagination schema", () => {
    expect(spec.components.schemas.Pagination).toBeDefined();
    expect(spec.components.schemas.Pagination.properties.cursor).toBeDefined();
    expect(
      spec.components.schemas.Pagination.properties.has_more,
    ).toBeDefined();
  });
});
