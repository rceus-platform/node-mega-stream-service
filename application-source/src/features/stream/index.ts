/**
 * Stream Feature Entry Point
 *
 * Responsibilities:
 * - Export the public API for the stream feature
 * - Encapsulate internal feature details
 *
 * Boundaries:
 * - Does not handle global routing or configuration
 */

export { handleStream } from "./controllers/streamController.js";
export { getOrCreateSession, evictSession } from "./services/megaService.js";
export * from "./types.js";
