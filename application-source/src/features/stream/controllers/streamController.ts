/**
 * Stream Controller Module
 *
 * Responsibilities:
 * - Handle video streaming requests from MEGA.nz
 * - Manage range headers and partial content delivery
 * - Coordinate between authentication and download streams
 *
 * Boundaries:
 * - Does not handle server initialization or environment configuration
 */

import { Request, Response } from "express";
import { getQueryParam, validateInternalSecret } from "../../../utils/helpers.js";
import { getOrCreateSession, evictSession } from "../services/megaService.js";
import { INTERNAL_SECRET } from "../../../config.js";

function inferMimeType(fileName: string): string {
    const normalized = fileName.toLowerCase();
    const ext = normalized.includes(".") ? normalized.slice(normalized.lastIndexOf(".")) : "";

    const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".m4v": "video/x-m4v",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".avi": "video/x-msvideo",
        ".ogv": "video/ogg",
        ".mpeg": "video/mpeg",
        ".mpg": "video/mpeg",
        ".ts": "video/mp2t",
    };

    return mimeMap[ext] || "application/octet-stream";
}

/** Main handler for the /stream endpoint */
export const handleStream = async (req: Request, res: Response): Promise<void | Response> => {
    // 1. Security Check
    if (!validateInternalSecret(req, INTERNAL_SECRET)) {
        return res.status(403).json({ error: "Forbidden: missing or invalid internal secret" });
    }

    // 2. Parameter Extraction (Prefer headers for security and character encoding stability)
    const email = (req.headers["x-mega-email"] as string) || getQueryParam(req.query.email);
    const password = (req.headers["x-mega-password"] as string) || getQueryParam(req.query.password);
    const fileId = getQueryParam(req.query.fileId);

    if (!email || !password || !fileId) {
        const error = "Missing required parameters: email, password, or fileId";
        return res.status(400).json({ error });
    }

    try {
        // 3. Session Retrieval
        const storage = await getOrCreateSession(email, password);
        const file = storage.files[fileId];

        if (!file) {
            return res.status(404).json({ error: "File not found in MEGA storage" });
        }

        // 4. Range Header Processing
        const fileSize = file.size;
        let start = 0;
        let end = fileSize - 1;
        let statusCode = 200;

        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const requestedStart = parseInt(parts[0], 10);
            const requestedEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const isInvalidRange = isNaN(requestedStart) || requestedStart < 0 ||
                                   requestedEnd >= fileSize || requestedStart > requestedEnd;
            if (isInvalidRange) {
                return res.status(416).json({ error: "Requested range not satisfiable" });
            }

            start = requestedStart;
            end = requestedEnd;
            statusCode = 206;
        }

        // 5. Download Stream Initialization
        const stream = file.download({ start, end });
        let bytesTransferred = 0;
        let clientDisconnected = false;

        stream.once("data", (chunk: Buffer) => {
            if (clientDisconnected || res.destroyed) return;

            bytesTransferred += chunk.length;
            const contentType = inferMimeType(file.name);

            const contentRange = `bytes ${start}-${end}/${fileSize}`;
            res.writeHead(statusCode, {
                "Accept-Ranges": "bytes",
                "Content-Length": end - start + 1,
                "Content-Type": contentType,
                ...(statusCode === 206 ? { "Content-Range": contentRange } : {}),
            });
            res.write(chunk);
            stream.pipe(res);
        });

        // 6. Request Lifecycle Management
        req.on("close", () => {
            clientDisconnected = true;
            if (stream && typeof stream.destroy === "function") {
                stream.destroy();
            }
        });

        stream.once("end", () => {
            if (bytesTransferred === 0 && !res.writableEnded && !res.destroyed) {
                res.status(502).json({ error: "Upstream MEGA server returned no data" });
            }
        });

        stream.on("error", (err: Error) => {
            // Log the error but don't evict if it was caused by a client-side disconnect
            if (clientDisconnected || res.destroyed) {
                console.log("[mega-stream] Stream ended due to client disconnect (ignore error)");
                return;
            }

            console.error("[mega-stream] Stream delivery error:", err);
            evictSession(email);

            if (bytesTransferred === 0 && !res.headersSent) {
                const error = "Failed to establish stream connection with MEGA";
                res.status(502).json({ error });
            } else if (!res.writableEnded) {
                res.end();
            }
        });

    } catch (err: unknown) {
        const error = err as Error;
        console.error("[mega-stream] Request handling exception:", error);
        
        const errMsg = error?.message || String(error);
        // Only evict on actual authentication, system errors, or blocks
        if (errMsg.includes("Wrong password") || errMsg.includes("ENOENT") || 
            errMsg.includes("EAGAIN") || errMsg.includes("ECONN") ||
            errMsg.includes("EBLOCKED")) {
            evictSession(email);
        }

        if (!res.headersSent) {
            if (errMsg.includes("Wrong password") || errMsg.includes("ENOENT")) {
                return res.status(401).json({ error: "Authentication failed or storage session expired" });
            }
            return res.status(500).json({ error: `Streaming system error: ${errMsg}` });
        } else if (!res.writableEnded) {
            res.end();
        }
    }
};
