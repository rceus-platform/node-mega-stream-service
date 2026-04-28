/**
 * MegaService Module
 *
 * Responsibilities:
 * - Manage MEGA.nz storage sessions
 * - Handle authentication and session caching
 * - Provide session eviction logic on failures
 *
 * Boundaries:
 * - Does not handle HTTP routing or response streaming
 */

import { Storage } from "megajs";

/** email -> Promise<Storage> cache to avoid redundant logins */
const sessionCache = new Map();

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
    if (sessionCache.has(email)) {
        return sessionCache.get(email);
    }

    console.log(`[mega-stream] Initiating first login for ${email}`);
    const sessionPromise = loginToMega(email, password);

    sessionCache.set(email, sessionPromise);

    sessionPromise.catch((err) => {
        const errorMsg = err.message || err;
        console.warn(`[mega-stream] Login failed for ${email}: ${errorMsg} - removing from cache`);
        sessionCache.delete(email);
    });

    return sessionPromise;
}

/** Remove a session from cache to force re-authentication */
export function evictSession(email) {
    if (sessionCache.has(email)) {
        console.warn(`[mega-stream] Evicting session for ${email}`);
        sessionCache.delete(email);
    }
}
