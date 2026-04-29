/**
 * Helpers Module Tests
 *
 * Responsibilities:
 * - Validate query parameter sanitization
 * - Verify internal secret validation logic
 *
 * Boundaries:
 * - Does not test network or MEGA integration
 */

import { describe, it, expect } from "vitest";
import { Request } from "express";
import { getQueryParam, validateInternalSecret } from "../utils/helpers.js";

describe("Helpers Module", () => {
    describe("getQueryParam", () => {
        it("should return trimmed string when input is a string", () => {
            expect(getQueryParam("  test  ")).toBe("test");
        });

        it("should return empty string when input is not a string", () => {
            expect(getQueryParam(null)).toBe("");
            expect(getQueryParam(undefined)).toBe("");
            expect(getQueryParam(123)).toBe("");
        });
    });

    describe("validateInternalSecret", () => {
        it("should return true if no secret is configured", () => {
            const req = { headers: {} } as Partial<Request>;
            expect(validateInternalSecret(req as Request, "")).toBe(true);
        });

        it("should return true if header matches configured secret", () => {
            const req = { headers: { "x-internal-secret": "topsecret" } } as Partial<Request>;
            expect(validateInternalSecret(req as Request, "topsecret")).toBe(true);
        });

        it("should return false if header does not match configured secret", () => {
            const req = { headers: { "x-internal-secret": "wrong" } } as Partial<Request>;
            expect(validateInternalSecret(req as Request, "topsecret")).toBe(false);
        });
    });
});
