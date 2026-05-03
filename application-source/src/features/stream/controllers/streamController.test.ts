import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { Request, Response } from "express";

const { mockGetOrCreateSession, mockEvictSession } = vi.hoisted(() => ({
    mockGetOrCreateSession: vi.fn(),
    mockEvictSession: vi.fn(),
}));

vi.mock("../services/megaService.js", () => ({
    getOrCreateSession: mockGetOrCreateSession,
    evictSession: mockEvictSession,
}));

vi.mock("../../../config.js", () => ({ INTERNAL_SECRET: "" }));

import { handleStream } from "./streamController.js";

function createReq(): Request {
    const req = new EventEmitter() as Request;
    req.headers = {};
    req.query = { email: "e@mega.nz", password: "pass", fileId: "f1" };
    return req;
}

function createRes(): Response {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        destroyed: false,
        headersSent: false,
        writableEnded: false,
    } as unknown as Response;
}

describe("streamController MIME inference", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets MKV content-type for .mkv files", async () => {
        const req = createReq();
        const res = createRes();

        const stream = new EventEmitter() as EventEmitter & { pipe: (target: unknown) => unknown };
        stream.pipe = vi.fn();

        mockGetOrCreateSession.mockResolvedValue({
            files: {
                f1: {
                    name: "movie.mkv",
                    size: 4,
                    download: () => stream,
                },
            },
        });

        await handleStream(req, res);
        stream.emit("data", Buffer.from("abcd"));

        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ "Content-Type": "video/x-matroska" })
        );
        expect(mockEvictSession).not.toHaveBeenCalled();
    });

    it("falls back to application/octet-stream for unknown extension", async () => {
        const req = createReq();
        const res = createRes();

        const stream = new EventEmitter() as EventEmitter & { pipe: (target: unknown) => unknown };
        stream.pipe = vi.fn();

        mockGetOrCreateSession.mockResolvedValue({
            files: {
                f1: {
                    name: "movie.unknownext",
                    size: 4,
                    download: () => stream,
                },
            },
        });

        await handleStream(req, res);
        stream.emit("data", Buffer.from("abcd"));

        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ "Content-Type": "application/octet-stream" })
        );
    });

    it("sets WebM content-type for .webm files", async () => {
        const req = createReq();
        const res = createRes();

        const stream = new EventEmitter() as EventEmitter & { pipe: (target: unknown) => unknown };
        stream.pipe = vi.fn();

        mockGetOrCreateSession.mockResolvedValue({
            files: {
                f1: {
                    name: "clip.webm",
                    size: 4,
                    download: () => stream,
                },
            },
        });

        await handleStream(req, res);
        stream.emit("data", Buffer.from("abcd"));

        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({ "Content-Type": "video/webm" })
        );
    });
});
