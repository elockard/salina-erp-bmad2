/**
 * API Response Utilities Tests
 *
 * Story 15.2 - Task 1: Response helpers
 * Tests for success/error response builders
 */

import { describe, expect, it } from "vitest";
import {
  apiError,
  apiSuccess,
  notFound,
  validationError,
  withRateLimitHeaders,
} from "@/modules/api/utils/response";

describe("API Response Utilities", () => {
  describe("apiSuccess", () => {
    it("returns JSON response with data and default 200 status", async () => {
      const data = { id: "123", name: "Test" };
      const response = apiSuccess(data);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("allows custom status code", async () => {
      const data = { id: "123" };
      const response = apiSuccess(data, 201);

      expect(response.status).toBe(201);
    });

    it("handles array data", async () => {
      const data = [{ id: "1" }, { id: "2" }];
      const response = apiSuccess(data);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("handles nested objects", async () => {
      const data = {
        data: [{ id: "1" }],
        pagination: { cursor: "abc", has_more: true },
      };
      const response = apiSuccess(data);

      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.pagination.has_more).toBe(true);
    });
  });

  describe("apiError", () => {
    it("returns error response with correct format", async () => {
      const response = apiError("not_found", "Resource not found", 404);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: "not_found",
          message: "Resource not found",
        },
      });
    });

    it("includes details when provided", async () => {
      const response = apiError("validation_error", "Validation failed", 400, {
        title: "Title is required",
        isbn: "Invalid ISBN format",
      });

      const body = await response.json();
      expect(body.error.details).toEqual({
        title: "Title is required",
        isbn: "Invalid ISBN format",
      });
    });

    it("omits details when not provided", async () => {
      const response = apiError("server_error", "Internal error", 500);

      const body = await response.json();
      expect(body.error).not.toHaveProperty("details");
    });
  });

  describe("notFound", () => {
    it("returns 404 with resource name", async () => {
      const response = notFound("Title");

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("not_found");
      expect(body.error.message).toBe("Title not found");
    });
  });

  describe("validationError", () => {
    it("returns 400 with field details", async () => {
      const response = validationError({
        email: "Invalid email format",
        name: "Name is required",
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("validation_error");
      expect(body.error.message).toBe("Validation failed");
      expect(body.error.details).toEqual({
        email: "Invalid email format",
        name: "Name is required",
      });
    });
  });

  describe("withRateLimitHeaders", () => {
    it("adds rate limit headers to response", async () => {
      const original = apiSuccess({ id: "1" });
      const response = withRateLimitHeaders(original, 100, 95, 1700000000);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("95");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000000");
    });

    it("preserves original response body", async () => {
      const original = apiSuccess({ id: "1" });
      const response = withRateLimitHeaders(original, 100, 95, 1700000000);

      const body = await response.json();
      expect(body).toEqual({ id: "1" });
    });
  });
});
