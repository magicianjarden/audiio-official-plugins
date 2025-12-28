/**
 * Sposify Database Setup Service
 *
 * Handles automatic database setup:
 * 1. Check if database exists
 * 2. Download pre-built database from CDN, or
 * 3. Build a sample database for testing
 */
export interface SetupProgress {
    phase: 'checking' | 'downloading' | 'extracting' | 'building' | 'verifying' | 'complete' | 'error';
    progress: number;
    message: string;
    bytesDownloaded?: number;
    totalBytes?: number;
    speed?: number;
}
export type ProgressCallback = (progress: SetupProgress) => void;
export interface SetupOptions {
    userDataPath: string;
    onProgress?: ProgressCallback;
    forceRebuild?: boolean;
    offlineMode?: boolean;
}
export interface SetupResult {
    success: boolean;
    databasePath: string | null;
    source: 'existing' | 'downloaded' | 'built' | 'failed';
    error?: string;
}
/**
 * Check if database exists and is valid
 */
export declare function checkDatabaseExists(userDataPath: string): {
    exists: boolean;
    path: string;
    valid: boolean;
};
/**
 * Main setup function - call this to ensure database is ready
 */
export declare function setupDatabase(options: SetupOptions): Promise<SetupResult>;
export default setupDatabase;
//# sourceMappingURL=database-setup.d.ts.map