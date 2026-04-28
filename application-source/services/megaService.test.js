/**
 * MegaService Module Tests
 *
 * Responsibilities:
 * - Validate session caching behavior
 * - Verify session eviction logic
 * - Ensure redundant logins are avoided
 *
 * Boundaries:
 * - Mocks the underlying megajs library to avoid real network calls
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateSession, evictSession } from "./megaService.js";
import { Storage } from "megajs";

// Mock megajs Storage
vi.mock("megajs", () => {
    return {
        Storage: vi.fn().mockImplementation(function({ email }, callback) {
            this.on = vi.fn();

            // Simulate async behavior
            setTimeout(() => {
                if (email === "fail@example.com") {
                    callback(new Error("Login failed"), null);
                } else if (email === "event-error@example.com") {
                    // Don't call callback yet, trigger error event instead
                    const errorHandler = this.on.mock.calls.find(call => call[0] === "error")[1];
                    if (errorHandler) errorHandler(new Error("Event-based error"));
                } else {
                    callback(null, { email, files: {} });
                }
            }, 10);

            return this;
        })
    };
});

describe("MegaService Module", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Force clear internal cache by evicting known test keys
        evictSession("test@example.com");
        evictSession("fail@example.com");
        evictSession("event-error@example.com");
    });

    it("should create a new session on first login", async () => {
        const session = await getOrCreateSession("test@example.com", "password");
        expect(session.email).toBe("test@example.com");
        expect(Storage).toHaveBeenCalledTimes(1);
    });

    it("should return cached session on subsequent calls", async () => {
        await getOrCreateSession("test@example.com", "password");
        const session = await getOrCreateSession("test@example.com", "password");

        expect(session.email).toBe("test@example.com");
        expect(Storage).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it("should remove from cache on failure", async () => {
        await expect(getOrCreateSession("fail@example.com", "password"))
            .rejects.toThrow("Login failed");

        // Second attempt should trigger a new Storage call because it was evicted
        await expect(getOrCreateSession("fail@example.com", "password"))
            .rejects.toThrow("Login failed");
        expect(Storage).toHaveBeenCalledTimes(2);
    });

    it("should handle event-based errors during login", async () => {
        await expect(getOrCreateSession("event-error@example.com", "password"))
            .rejects.toThrow("Event-based error");

        expect(Storage).toHaveBeenCalledTimes(1);
    });

    it("should allow manual eviction", async () => {
        await getOrCreateSession("test@example.com", "password");
        evictSession("test@example.com");

        await getOrCreateSession("test@example.com", "password");
        expect(Storage).toHaveBeenCalledTimes(2);
    });
});
