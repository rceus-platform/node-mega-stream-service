/**
 * MegaService Module
 *
 * Responsibilities:
 * - Manage MEGA.nz storage sessions
 * - Handle authentication and session caching
 * - Provide session eviction logic on failures
 * - Protect accounts from blocks via failure caching and login coalescing
 *
 * Boundaries:
 * - Does not handle HTTP routing or response streaming
 */

import { Storage } from "megajs";

/** email -> resolved Storage instance cache */
const sessionCache = new Map();

/** email -> { expiry: number, error: string } cache for failed logins */
const failureCache = new Map();

/** email -> Promise<Storage> for in-flight login attempts (coalesces concurrent requests) */
const pendingLogins = new Map();

const LOCKOUT_EBLOCKED = 60 * 60 * 1000; // 1 hour — MEGA blocks are severe
const LOCKOUT_DEFAULT = 5 * 60 * 1000;   // 5 minutes

/** Internal helper to perform MEGA login */
function loginToMega(email, password) {
    return new Promise((resolve, reject) => {
        const storage = new Storage({ email, password }, (err, readyStorage) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(readyStorage);
        });

        storage.on("error", reject);
    });
}

/** Retrieve an existing session or initiate a new login */
export async function getOrCreateSession(email, password) {
    // 1. Return resolved session if available
    if (sessionCache.has(email)) {
        return sessionCache.get(email);
    }

    // 2. Check for lockout (failed login cooldown)
    const failure = failureCache.get(email);
    if (failure) {
        if (Date.now() < failure.expiry) {
            const remaining = Math.ceil((failure.expiry - Date.now()) / 1000);
            throw new Error(`Account is in lockout for another ${remaining}s due to previous error: ${failure.error}`);
        }
        failureCache.delete(email);
    }

    // 3. Coalesce concurrent login attempts — only ONE login call per email
    if (pendingLogins.has(email)) {
        return pendingLogins.get(email);
    }

    console.log(`[mega-stream] Initiating first login for ${email}`);
    const loginPromise = loginToMega(email, password)
        .then((storage) => {
            sessionCache.set(email, storage);
            pendingLogins.delete(email);
            return storage;
        })
        .catch((err) => {
            const errorMsg = err.message || String(err);
            console.warn(`[mega-stream] Login failed for ${email}: ${errorMsg} — entering lockout`);

            pendingLogins.delete(email);

            const isBlocked = errorMsg.includes("EBLOCKED");
            const lockoutMs = isBlocked ? LOCKOUT_EBLOCKED : LOCKOUT_DEFAULT;
            failureCache.set(email, {
                expiry: Date.now() + lockoutMs,
                error: errorMsg
            });

            throw err;
        });

    pendingLogins.set(email, loginPromise);
    return loginPromise;
}

/** Remove a session from cache to force re-authentication */
export function evictSession(email) {
    if (sessionCache.has(email)) {
        console.warn(`[mega-stream] Evicting session for ${email}`);
        sessionCache.delete(email);
    }
    pendingLogins.delete(email);
}
