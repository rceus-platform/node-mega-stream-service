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

/** Sanitize and trim query parameter values */
export function getQueryParam(value) {
    return typeof value === "string" ? value.trim() : "";
}

/** Check if the internal secret in headers matches the configuration */
export function validateInternalSecret(req, secret) {
    if (!secret) return true;
    return req.headers["x-internal-secret"] === secret;
}
