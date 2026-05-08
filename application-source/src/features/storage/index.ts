/**
 * Storage Operations Module
 *
 * Responsibilities:
 * - Handle physical file operations (move, copy, delete) triggered by the FastAPI backend
 * - Validate requests via the internal shared secret
 *
 * Boundaries:
 * - Does not handle streaming or metadata (delegated to the stream feature)
 * - Database updates are managed by the FastAPI backend, not here
 *
 * Note: Physical operations are fire-and-forget from the FastAPI side.
 * This service logs failures but does not block the DB transaction.
 */

import { Request, Response } from "express";
import { INTERNAL_SECRET } from "../../config.js";

interface StorageMoveBody {
    item_ids: string[];
    destination_id: string | null;
}

interface StorageCopyBody {
    item_ids: string[];
    destination_id: string | null;
    copied_ids: string[];
}

interface StorageDeleteBody {
    item_ids: string[];
}

/** Validate the internal shared secret on inbound requests from FastAPI. */
function validateInternalSecret(req: Request, res: Response): boolean {
    if (!INTERNAL_SECRET) return true; // Secret not configured — allow all (dev mode)
    const incoming = req.headers["x-internal-secret"];
    if (incoming !== INTERNAL_SECRET) {
        res.status(403).json({ error: "Forbidden" });
        return false;
    }
    return true;
}

/**
 * POST /storage/move
 *
 * Placeholder for future provider-specific move implementation.
 * Currently acknowledges the request; physical storage move is
 * handled by the cloud provider SDK (MEGA/GDrive) as needed.
 */
export async function handleStorageMove(req: Request, res: Response): Promise<void> {
    if (!validateInternalSecret(req, res)) return;

    const { item_ids, destination_id }: StorageMoveBody = req.body;

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
        res.status(400).json({ error: "item_ids must be a non-empty array" });
        return;
    }

    console.info(
        `[storage/move] Moving ${item_ids.length} item(s) to destination: ${destination_id ?? "root"}`
    );

    // TODO: Implement MEGA-specific move via mega.js when provider === 'mega'
    // TODO: Implement GDrive move via googleapis when provider === 'gdrive'

    res.status(200).json({
        status: "acknowledged",
        moved: item_ids.length,
        destination_id,
    });
}

/**
 * POST /storage/copy
 *
 * Placeholder for provider-specific deep copy implementation.
 */
export async function handleStorageCopy(req: Request, res: Response): Promise<void> {
    if (!validateInternalSecret(req, res)) return;

    const { item_ids, destination_id, copied_ids }: StorageCopyBody = req.body;

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
        res.status(400).json({ error: "item_ids must be a non-empty array" });
        return;
    }

    console.info(
        `[storage/copy] Copying ${item_ids.length} item(s) → ${copied_ids?.length ?? 0} new records`
    );

    // TODO: Implement MEGA-specific copy via mega.js
    // TODO: Implement GDrive copy via googleapis (files.copy)

    res.status(200).json({
        status: "acknowledged",
        source_count: item_ids.length,
        destination_id,
    });
}

/**
 * POST /storage/delete
 *
 * Remove physical files from the cloud provider storage.
 */
export async function handleStorageDelete(req: Request, res: Response): Promise<void> {
    if (!validateInternalSecret(req, res)) return;

    const { item_ids }: StorageDeleteBody = req.body;

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
        res.status(400).json({ error: "item_ids must be a non-empty array" });
        return;
    }

    console.info(`[storage/delete] Deleting ${item_ids.length} item(s) from physical storage`);

    // TODO: Implement MEGA-specific deletion via mega.js (node.remove())
    // TODO: Implement GDrive deletion via googleapis (files.delete)

    res.status(200).json({
        status: "acknowledged",
        deleted: item_ids.length,
    });
}

/**
 * POST /storage/rename
 *
 * Rename the physical file/folder on the cloud provider.
 */
export async function handleStorageRename(req: Request, res: Response): Promise<void> {
    if (!validateInternalSecret(req, res)) return;

    const { item_id, new_name } = req.body as { item_id: string; new_name: string };

    if (!item_id || !new_name) {
        res.status(400).json({ error: "item_id and new_name are required" });
        return;
    }

    console.info(`[storage/rename] Renaming item ${item_id} → "${new_name}"`);

    // TODO: Implement MEGA rename via mega.js (node.rename())
    // TODO: Implement GDrive rename via googleapis (files.update with name field)

    res.status(200).json({
        status: "acknowledged",
        item_id,
        new_name,
    });
}
