/**
 * Sposify Database Manager
 * Handles SQLite connection and core database operations
 */
import Database from 'better-sqlite3';
import type { DatabaseStatus, DbTrack, DbAudioFeatures, DbArtist, DbAlbum } from '../types';
import { type ProgressCallback } from './database-setup';
export declare class SposifyDatabase {
    private db;
    private dbPath;
    private isInitialized;
    private isSettingUp;
    private setupPromise;
    /**
     * Initialize the database connection
     * Automatically sets up database if not present
     */
    initialize(userDataPath: string, options?: {
        onProgress?: ProgressCallback;
        forceRebuild?: boolean;
    }): Promise<DatabaseStatus>;
    /**
     * Open database file
     */
    private openDatabase;
    /**
     * Get empty status object
     */
    private getEmptyStatus;
    /**
     * Check if database is currently setting up
     */
    isSetupInProgress(): boolean;
    /**
     * Get database status and statistics
     */
    getStatus(): DatabaseStatus;
    /**
     * Get count from a table
     */
    private getTableCount;
    /**
     * Get metadata value
     */
    private getMetadata;
    /**
     * Check if database is ready
     */
    isReady(): boolean;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Get track by Spotify ID
     */
    getTrackById(spotifyId: string): DbTrack | null;
    /**
     * Get track by ISRC
     */
    getTrackByIsrc(isrc: string): DbTrack | null;
    /**
     * Search tracks by title and artist
     */
    searchTracks(title: string, artist: string, limit?: number): DbTrack[];
    /**
     * Get tracks by IDs (batch)
     */
    getTracksByIds(spotifyIds: string[]): DbTrack[];
    /**
     * Get tracks by ISRCs (batch)
     */
    getTracksByIsrcs(isrcs: string[]): DbTrack[];
    /**
     * Get audio features by Spotify ID
     */
    getAudioFeatures(spotifyId: string): DbAudioFeatures | null;
    /**
     * Get audio features by ISRC (through track lookup)
     */
    getAudioFeaturesByIsrc(isrc: string): DbAudioFeatures | null;
    /**
     * Get audio features batch
     */
    getAudioFeaturesBatch(spotifyIds: string[]): Map<string, DbAudioFeatures>;
    /**
     * Get artist by ID
     */
    getArtistById(artistId: string): DbArtist | null;
    /**
     * Search artists by name
     */
    searchArtists(name: string, limit?: number): DbArtist[];
    /**
     * Get album by ID
     */
    getAlbumById(albumId: string): DbAlbum | null;
    /**
     * Get album by UPC
     */
    getAlbumByUpc(upc: string): DbAlbum | null;
    /**
     * Normalize string for matching
     */
    private normalizeString;
    /**
     * Get raw database connection (for advanced queries)
     */
    getRawDb(): Database.Database | null;
}
export declare function getSposifyDatabase(): SposifyDatabase;
export declare function closeSposifyDatabase(): void;
//# sourceMappingURL=sposify-db.d.ts.map