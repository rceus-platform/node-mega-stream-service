/**
 * Config Module Tests
 *
 * Responsibilities:
 * - Validate environment variable loading
 * - Ensure default fallback values are used correctly
 *
 * Boundaries:
 * - Does not test real .env file parsing (mocks process.env)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dotenv to prevent it from loading real .env
vi.mock("dotenv", () => ({
    default: { config: vi.fn() }
}));

describe("Config Module", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    it("should load INTERNAL_SECRET from environment", async () => {
        vi.stubEnv("INTERNAL_SECRET", "test-secret");
        const { INTERNAL_SECRET } = await import("../config.js");
        expect(INTERNAL_SECRET).toBe("test-secret");
    });

    it("should fallback to empty string for INTERNAL_SECRET if not provided", async () => {
        vi.stubEnv("INTERNAL_SECRET", "");
        const { INTERNAL_SECRET } = await import("../config.js");
        expect(INTERNAL_SECRET).toBe("");
    });

    it("should load PORT from environment", async () => {
        vi.stubEnv("PORT", "5000");
        const { PORT } = await import("../config.js");
        expect(PORT).toBe("5000");
    });

    it("should fallback to 4000 for PORT if not provided", async () => {
        vi.stubEnv("PORT", "");
        const { PORT } = await import("../config.js");
        expect(PORT).toBe(4000);
    });
});
