/**
 * Index Module Tests
 *
 * Responsibilities:
 * - Verify Express application initialization
 * - Ensure health and stream routes are correctly registered
 * - Validate server startup sequence
 *
 * Boundaries:
 * - Mocks express to avoid starting a real network server during testing
 */

import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";

// Mock Express
vi.mock("express", () => {
    const mockApp = {
        get: vi.fn(),
        listen: vi.fn((_port, cb) => cb && cb()),
    };
    const mockExpress = vi.fn(() => mockApp);
    return { default: mockExpress };
});

// Mock dependencies to avoid side effects
vi.mock("../config.js", () => ({ PORT: 4000 }));
vi.mock("../features/stream/index.js", () => ({ handleStream: vi.fn() }));

describe("Index Module", () => {
    it("should initialize express and register routes", async () => {
        // Import index.ts to trigger initialization
        await import("../index.js");

        const express = (await import("express")).default;
        const app = express();

        expect(express).toHaveBeenCalled();
        expect(app.get).toHaveBeenCalledWith("/health", expect.any(Function));
        expect(app.get).toHaveBeenCalledWith("/stream", expect.any(Function));
        expect(app.listen).toHaveBeenCalledWith(4000, expect.any(Function));
    });

    it("health check should return OK", async () => {
        await import("../index.js");
        const express = (await import("express")).default;
        const app = express();

        // Find the health check handler
        const getMock = app.get as unknown as { mock: { calls: [string, (...args: unknown[]) => void][] } };
        const healthHandler = getMock.mock.calls.find(call => call[0] === "/health")![1];

        const req = {} as Partial<Request>;
        const res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        } as unknown as Response;

        healthHandler(req as Request, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith("OK");
    });
});
