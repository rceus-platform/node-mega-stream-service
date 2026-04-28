/**
 * Stream Route Tests
 *
 * Responsibilities:
 * - Validate streaming behavior and range header handling
 * - Ensure security and parameter validation
 * - Verify MIME type detection and error recovery
 *
 * Boundaries:
 * - Mocks MEGA services and helper utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleStream } from "./stream.js";
import * as helpers from "../utils/helpers.js";
import * as megaService from "../services/megaService.js";
import { EventEmitter } from "events";

vi.mock("../utils/helpers.js");
vi.mock("../services/megaService.js");

describe("handleStream", () => {
    let req, res;

    beforeEach(() => {
        req = {
            query: { email: "test@example.com", password: "pass", fileId: "file123" },
            headers: {},
            on: vi.fn(),
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            writeHead: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
        };
        vi.clearAllMocks();
    });

    it("should return 403 if internal secret is invalid", async () => {
        helpers.validateInternalSecret.mockReturnValue(false);
        await handleStream(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should return 400 if required parameters are missing", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        req.query = {};
        helpers.getQueryParam.mockReturnValue(null);

        await handleStream(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should extract credentials from headers if present", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        req.headers["x-mega-email"] = "header@example.com";
        req.headers["x-mega-password"] = "header-pass";

        megaService.getOrCreateSession.mockResolvedValue({ files: {} });

        await handleStream(req, res);

        expect(megaService.getOrCreateSession)
            .toHaveBeenCalledWith("header@example.com", "header-pass");
    });

    it("should return 404 if file is not found in storage", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);
        megaService.getOrCreateSession.mockResolvedValue({ files: {} });

        await handleStream(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "File not found in MEGA storage" });
    });

    it("should initialize stream and handle range headers", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockStream = new EventEmitter();
        mockStream.pipe = vi.fn();
        mockStream.destroy = vi.fn();

        const mockFile = {
            name: "video.mp4",
            size: 1000,
            download: vi.fn().mockReturnValue(mockStream),
        };

        megaService.getOrCreateSession.mockResolvedValue({
            files: { "file123": mockFile }
        });

        req.headers.range = "bytes=0-499";

        await handleStream(req, res);

        // Simulate stream starting
        mockStream.emit("data", Buffer.alloc(100));

        expect(mockFile.download).toHaveBeenCalledWith({ start: 0, end: 499 });
        expect(res.writeHead).toHaveBeenCalledWith(206, expect.objectContaining({
            "Content-Range": "bytes 0-499/1000",
            "Content-Length": 500,
            "Content-Type": "video/mp4"
        }));
    });

    it("should handle various MIME types based on file extension", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const testCases = [
            { name: "test.png", expected: "image/png" },
            { name: "test.jpg", expected: "image/jpeg" },
            { name: "test.jpeg", expected: "image/jpeg" },
            { name: "test.webp", expected: "image/webp" },
            { name: "test.unknown", expected: "video/mp4" },
        ];

        for (const tc of testCases) {
            const mockStream = new EventEmitter();
            mockStream.pipe = vi.fn();
            const mockFile = {
                name: tc.name,
                size: 100,
                download: vi.fn().mockReturnValue(mockStream)
            };
            megaService.getOrCreateSession.mockResolvedValue({ files: { "file123": mockFile } });

            await handleStream(req, res);
            mockStream.emit("data", Buffer.alloc(10));

            expect(res.writeHead).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                "Content-Type": tc.expected
            }));
            vi.clearAllMocks();
        }
    });

    it("should return 416 for invalid range headers", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockFile = { size: 1000 };
        megaService.getOrCreateSession.mockResolvedValue({ files: { "file123": mockFile } });

        const invalidRanges = ["bytes=1000-2000", "bytes=500-400", "bytes=abc-def", "bytes=-1-500"];

        for (const range of invalidRanges) {
            req.headers.range = range;
            await handleStream(req, res);
            expect(res.status).toHaveBeenCalledWith(416);
            vi.clearAllMocks();
        }
    });

    it("should evict session and return 502 if stream establishment fails", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockStream = new EventEmitter();
        const mockFile = {
            name: "test.mp4",
            size: 1000,
            download: vi.fn().mockReturnValue(mockStream)
        };
        megaService.getOrCreateSession.mockResolvedValue({ files: { "file123": mockFile } });

        await handleStream(req, res);

        // Simulate error before any data
        mockStream.emit("error", new Error("Network error"));

        expect(megaService.evictSession).toHaveBeenCalledWith("test@example.com");
        expect(res.status).toHaveBeenCalledWith(502);
    });

    it("should end response but not set status if stream fails after data started", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockStream = new EventEmitter();
        mockStream.pipe = vi.fn();
        const mockFile = {
            name: "test.mp4",
            size: 1000,
            download: vi.fn().mockReturnValue(mockStream)
        };
        megaService.getOrCreateSession.mockResolvedValue({ files: { "file123": mockFile } });

        await handleStream(req, res);

        // Data started
        mockStream.emit("data", Buffer.alloc(10));

        // Error occurred
        mockStream.emit("error", new Error("Interrupted"));

        expect(res.end).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(502); // Too late for headers
    });

    it("should handle session retrieval exceptions", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        megaService.getOrCreateSession.mockRejectedValue(new Error("Wrong password"));

        await handleStream(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Authentication failed or storage session expired"
        }));
    });

    it("should return 502 if MEGA server returns no data", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockStream = new EventEmitter();
        mockStream.pipe = vi.fn();
        const mockFile = {
            name: "test.mp4",
            size: 1000,
            download: vi.fn().mockReturnValue(mockStream)
        };
        megaService.getOrCreateSession.mockResolvedValue({ files: { "file123": mockFile } });

        await handleStream(req, res);

        mockStream.emit("end");

        expect(res.status).toHaveBeenCalledWith(502);
    });

    it("should destroy stream when request is closed", async () => {
        helpers.validateInternalSecret.mockReturnValue(true);
        helpers.getQueryParam.mockImplementation((val) => val);

        const mockStream = new EventEmitter();
        mockStream.destroy = vi.fn();

        const mockFile = {
            size: 1000,
            download: vi.fn().mockReturnValue(mockStream),
        };

        megaService.getOrCreateSession.mockResolvedValue({
            files: { "file123": mockFile }
        });

        let closeHandler;
        req.on.mockImplementation((event, handler) => {
            if (event === "close") closeHandler = handler;
        });

        await handleStream(req, res);

        // Simulate client closing connection
        closeHandler();

        expect(mockStream.destroy).toHaveBeenCalled();
    });
});
