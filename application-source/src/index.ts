/**
 * Mega Stream Service Entry Point
 *
 * Responsibilities:
 * - Initialize Express application
 * - Mount routes and middleware
 * - Start the server on the configured port
 *
 * Boundaries:
 * - Does not handle business logic, streaming, or environment parsing directly
 */

import express, { Request, Response } from "express";
import { PORT } from "./config.js";
import { handleStream } from "./features/stream/index.js";
import {
    handleStorageCopy,
    handleStorageDelete,
    handleStorageMove,
    handleStorageRename,
} from "./features/storage/index.js";

const app = express();

// Parse JSON bodies for internal service-to-service calls
app.use(express.json());

/** Health check endpoint */
app.get("/health", (_req: Request, res: Response) => res.status(200).send("OK"));

/** Main streaming endpoint */
app.get("/stream", handleStream);

/** Storage operation endpoints (called by FastAPI backend) */
app.post("/storage/move", handleStorageMove);
app.post("/storage/copy", handleStorageCopy);
app.post("/storage/delete", handleStorageDelete);
app.post("/storage/rename", handleStorageRename);

/** Server initialization */
app.listen(PORT, () => {
    console.log(`Mega Stream Service running on http://localhost:${PORT}`);
});
