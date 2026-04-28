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

import { getQueryParam, validateInternalSecret } from "../utils/helpers.js";
import { getOrCreateSession, evictSession } from "../services/megaService.js";
import { INTERNAL_SECRET } from "../config.js";

/** Main handler for the /stream endpoint */
export const handleStream = async (req, res) => {
    // 1. Security Check
    if (!validateInternalSecret(req, INTERNAL_SECRET)) {
        return res.status(403).json({ error: "Forbidden: missing or invalid internal secret" });
    }

    // 2. Parameter Extraction (Prefer headers for security and character encoding stability)
    const email = req.headers["x-mega-email"] || getQueryParam(req.query.email);
    const password = req.headers["x-mega-password"] || getQueryParam(req.query.password);
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

        stream.once("data", (chunk) => {
            bytesTransferred += chunk.length;
            const isImage = file.name.toLowerCase().endsWith(".png") ||
                            file.name.toLowerCase().endsWith(".jpg") ||
                            file.name.toLowerCase().endsWith(".jpeg") ||
                            file.name.toLowerCase().endsWith(".webp");

            const contentType = isImage ?
                               (file.name.toLowerCase().endsWith(".png") ? "image/png" :
                                file.name.toLowerCase().endsWith(".webp") ? "image/webp" :
                                "image/jpeg") : "video/mp4";

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
            if (stream && typeof stream.destroy === "function") {
                stream.destroy();
            }
        });

        stream.once("end", () => {
            if (bytesTransferred === 0) {
                res.status(502).json({ error: "Upstream MEGA server returned no data" });
            }
        });

        stream.once("error", (err) => {
            console.error("[mega-stream] Stream delivery error:", err);
            evictSession(email);
            if (bytesTransferred === 0) {
                const error = "Failed to establish stream connection with MEGA";
                return res.status(502).json({ error });
            }
            res.end();
        });

    } catch (err) {
        console.error("[mega-stream] Request handling exception:", err);
        evictSession(email);

        const errMsg = err?.message || String(err);
        if (errMsg.includes("Wrong password") || errMsg.includes("ENOENT")) {
            const error = "Authentication failed or storage session expired";
            return res.status(401).json({ error });
        }

        return res.status(500).json({ error: `Streaming system error: ${errMsg}` });
    }
};
