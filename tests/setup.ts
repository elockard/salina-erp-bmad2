import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { afterEach, beforeEach, vi } from "vitest";

// Load environment variables from .env for integration tests
config();

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Setup global test environment
beforeEach(() => {
  // Environment is already set to test by vitest
});

// Mock Next.js modules that don't work in test environment
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
}));
