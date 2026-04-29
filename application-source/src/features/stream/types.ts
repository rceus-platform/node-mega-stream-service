/**
 * Stream Feature Types
 *
 * Responsibilities:
 * - Define interfaces for MEGA storage and sessions
 * - Provide type safety for stream-related data
 *
 * Boundaries:
 * - Does not contain business logic or API calls
 */

export interface MegaFile {
    name: string;
    size: number;
    download: (options: { start: number; end: number }) => NodeJS.ReadableStream & { destroy: () => void };
}

export interface MegaStorage {
    files: Record<string, MegaFile>;
    on: (event: string, callback: (err?: Error) => void) => void;
}

export interface FailureState {
    expiry: number;
    error: string;
}
