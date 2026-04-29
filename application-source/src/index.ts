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

const app = express();

/** Health check endpoint */
app.get("/health", (_req: Request, res: Response) => res.status(200).send("OK"));

/** Main streaming endpoint */
app.get("/stream", handleStream);

/** Server initialization */
app.listen(PORT, () => {
    console.log(`Mega Stream Service running on http://localhost:${PORT}`);
});
