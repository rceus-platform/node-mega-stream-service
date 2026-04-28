/**
 * Config Module
 *
 * Responsibilities:
 * - Load and export environment variables
 * - Provide default values for configuration
 *
 * Boundaries:
 * - Does not handle business logic or API calls
 */

import dotenv from "dotenv";

dotenv.config();

/** Internal secret for inter-service authentication */
export const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "";

/** Port for the service to listen on */
export const PORT = process.env.PORT || 4000;
