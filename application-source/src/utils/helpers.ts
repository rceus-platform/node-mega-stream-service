/**
 * Helpers Module
 *
 * Responsibilities:
 * - Provide utility functions for request handling
 * - Sanitize and validate input data
 *
 * Boundaries:
 * - Does not handle session state or MEGA logic
 */

import { Request } from "express";

/** Sanitize and trim query parameter values */
export function getQueryParam(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/** Check if the internal secret in headers matches the configuration */
export function validateInternalSecret(req: Request, secret: string): boolean {
    if (!secret) return true;
    return req.headers["x-internal-secret"] === secret;
}
