"use strict";
/**
 * Sposify Database Manager
 * Handles SQLite connection and core database operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SposifyDatabase = void 0;
exports.getSposifyDatabase = getSposifyDatabase;
exports.closeSposifyDatabase = closeSposifyDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const database_setup_1 = require("./database-setup");
class SposifyDatabase {
    db = null;
    dbPath = null;
    isInitialized = false;
    isSettingUp = false;
    setupPromise = null;
    /**
     * Initialize the database connection
     * Automatically sets up database if not present
     */
    async initialize(userDataPath, options) {
        // If already setting up, return existing promise
        if (this.setupPromise) {
            return this.setupPromise;
        }
        // If already initialized, return status
        if (this.isInitialized && this.db) {
            return this.getStatus();
        }
        const bundledDbPath = path.join(userDataPath, 'sposify', 'sposify_bundle.sqlite3');
        // Check if database exists and is valid
        const check = (0, database_setup_1.checkDatabaseExists)(userDataPath);
        if (!check.valid || options?.forceRebuild) {
            // Need to setup database
            this.isSettingUp = true;
            this.setupPromise = (async () => {
                try {
                    console.log('[Sposify] Database not found, initiating setup...');
                    const result = await (0, database_setup_1.setupDatabase)({
                        userDataPath,
                        onProgress: options?.onProgress,
                        forceRebuild: options?.forceRebuild,
                    });
                    if (!result.success) {
                        console.error('[Sposify] Database setup failed:', result.error);
                        return this.getEmptyStatus();
                    }
                    console.log(`[Sposify] Database ready (source: ${result.source})`);
                    // Now open the database
                    return this.openDatabase(bundledDbPath);
                }
                catch (error) {
                    console.error('[Sposify] Setup error:', error);
                    return this.getEmptyStatus();
                }
                finally {
                    this.isSettingUp = false;
                    this.setupPromise = null;
                }
            })();
            return this.setupPromise;
        }
        // Database exists and is valid, just open it
        return this.openDatabase(bundledDbPath);
    }
    /**
     * Open database file
     */
    openDatabase(dbPath) {
        try {
            this.db = new better_sqlite3_1.default(dbPath, { readonly: true });
            this.dbPath = dbPath;
            this.isInitialized = true;
            // Enable optimizations
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('cache_size = -64000'); // 64MB cache
            this.db.pragma('temp_store = MEMORY');
            return this.getStatus();
        }
        catch (error) {
            console.error('[Sposify] Failed to open database:', error);
            return this.getEmptyStatus();
        }
    }
    /**
     * Get empty status object
     */
    getEmptyStatus() {
        return {
            ready: false,
            path: null,
            trackCount: 0,
            artistCount: 0,
            albumCount: 0,
            playlistCount: 0,
            hasAudioFeatures: false,
            audioFeaturesCount: 0,
            databaseSizeBytes: 0,
            version: '0.0.0',
            lastUpdated: null,
        };
    }
    /**
     * Check if database is currently setting up
     */
    isSetupInProgress() {
        return this.isSettingUp;
    }
    /**
     * Get database status and statistics
     */
    getStatus() {
        if (!this.db || !this.dbPath) {
            return {
                ready: false,
                path: null,
                trackCount: 0,
                artistCount: 0,
                albumCount: 0,
                playlistCount: 0,
                hasAudioFeatures: false,
                audioFeaturesCount: 0,
                databaseSizeBytes: 0,
                version: '0.0.0',
                lastUpdated: null,
            };
        }
        const trackCount = this.getTableCount('tracks');
        const artistCount = this.getTableCount('artists');
        const albumCount = this.getTableCount('albums');
        const playlistCount = this.getTableCount('playlist_index');
        const audioFeaturesCount = this.getTableCount('audio_features');
        const stats = fs.statSync(this.dbPath);
        return {
            ready: true,
            path: this.dbPath,
            trackCount,
            artistCount,
            albumCount,
            playlistCount,
            hasAudioFeatures: audioFeaturesCount > 0,
            audioFeaturesCount,
            databaseSizeBytes: stats.size,
            version: this.getMetadata('version') || '1.0.0',
            lastUpdated: parseInt(this.getMetadata('last_updated') || '0', 10) || null,
        };
    }
    /**
     * Get count from a table
     */
    getTableCount(table) {
        if (!this.db)
            return 0;
        try {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            return result?.count || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get metadata value
     */
    getMetadata(key) {
        if (!this.db)
            return null;
        try {
            const result = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
            return result?.value || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Check if database is ready
     */
    isReady() {
        return this.isInitialized && this.db !== null;
    }
    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
    // ============================================================================
    // Track Queries
    // ============================================================================
    /**
     * Get track by Spotify ID
     */
    getTrackById(spotifyId) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM tracks WHERE spotify_id = ?').get(spotifyId) || null;
    }
    /**
     * Get track by ISRC
     */
    getTrackByIsrc(isrc) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM tracks WHERE isrc = ?').get(isrc.toUpperCase()) || null;
    }
    /**
     * Search tracks by title and artist
     */
    searchTracks(title, artist, limit = 10) {
        if (!this.db)
            return [];
        // First try exact match
        const exactMatch = this.db.prepare(`
      SELECT * FROM tracks
      WHERE LOWER(title) = LOWER(?) AND LOWER(artist_name) = LOWER(?)
      LIMIT 1
    `).get(title, artist);
        if (exactMatch)
            return [exactMatch];
        // Then try normalized match
        const normalizedTitle = this.normalizeString(title);
        const normalizedArtist = this.normalizeString(artist);
        return this.db.prepare(`
      SELECT *,
        CASE
          WHEN LOWER(title) = LOWER(?) AND LOWER(artist_name) = LOWER(?) THEN 100
          WHEN LOWER(title) LIKE ? AND LOWER(artist_name) LIKE ? THEN 80
          WHEN LOWER(title) LIKE ? THEN 50
          ELSE 30
        END as match_score
      FROM tracks
      WHERE LOWER(title) LIKE ? OR LOWER(artist_name) LIKE ?
      ORDER BY match_score DESC, popularity DESC
      LIMIT ?
    `).all(title, artist, `%${normalizedTitle}%`, `%${normalizedArtist}%`, `%${normalizedTitle}%`, `%${normalizedTitle}%`, `%${normalizedArtist}%`, limit);
    }
    /**
     * Get tracks by IDs (batch)
     */
    getTracksByIds(spotifyIds) {
        if (!this.db || spotifyIds.length === 0)
            return [];
        const placeholders = spotifyIds.map(() => '?').join(',');
        return this.db.prepare(`
      SELECT * FROM tracks WHERE spotify_id IN (${placeholders})
    `).all(...spotifyIds);
    }
    /**
     * Get tracks by ISRCs (batch)
     */
    getTracksByIsrcs(isrcs) {
        if (!this.db || isrcs.length === 0)
            return [];
        const normalizedIsrcs = isrcs.map(i => i.toUpperCase());
        const placeholders = normalizedIsrcs.map(() => '?').join(',');
        return this.db.prepare(`
      SELECT * FROM tracks WHERE isrc IN (${placeholders})
    `).all(...normalizedIsrcs);
    }
    // ============================================================================
    // Audio Features Queries
    // ============================================================================
    /**
     * Get audio features by Spotify ID
     */
    getAudioFeatures(spotifyId) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM audio_features WHERE spotify_id = ?').get(spotifyId) || null;
    }
    /**
     * Get audio features by ISRC (through track lookup)
     */
    getAudioFeaturesByIsrc(isrc) {
        const track = this.getTrackByIsrc(isrc);
        if (!track)
            return null;
        return this.getAudioFeatures(track.spotify_id);
    }
    /**
     * Get audio features batch
     */
    getAudioFeaturesBatch(spotifyIds) {
        if (!this.db || spotifyIds.length === 0)
            return new Map();
        const placeholders = spotifyIds.map(() => '?').join(',');
        const results = this.db.prepare(`
      SELECT * FROM audio_features WHERE spotify_id IN (${placeholders})
    `).all(...spotifyIds);
        return new Map(results.map(f => [f.spotify_id, f]));
    }
    // ============================================================================
    // Artist Queries
    // ============================================================================
    /**
     * Get artist by ID
     */
    getArtistById(artistId) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM artists WHERE spotify_id = ?').get(artistId) || null;
    }
    /**
     * Search artists by name
     */
    searchArtists(name, limit = 10) {
        if (!this.db)
            return [];
        return this.db.prepare(`
      SELECT * FROM artists
      WHERE LOWER(name) LIKE LOWER(?)
      ORDER BY popularity DESC
      LIMIT ?
    `).all(`%${name}%`, limit);
    }
    // ============================================================================
    // Album Queries
    // ============================================================================
    /**
     * Get album by ID
     */
    getAlbumById(albumId) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM albums WHERE spotify_id = ?').get(albumId) || null;
    }
    /**
     * Get album by UPC
     */
    getAlbumByUpc(upc) {
        if (!this.db)
            return null;
        return this.db.prepare('SELECT * FROM albums WHERE upc = ?').get(upc) || null;
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Normalize string for matching
     */
    normalizeString(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\w\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }
    /**
     * Get raw database connection (for advanced queries)
     */
    getRawDb() {
        return this.db;
    }
}
exports.SposifyDatabase = SposifyDatabase;
// Singleton instance
let instance = null;
function getSposifyDatabase() {
    if (!instance) {
        instance = new SposifyDatabase();
    }
    return instance;
}
function closeSposifyDatabase() {
    if (instance) {
        instance.close();
        instance = null;
    }
}
//# sourceMappingURL=sposify-db.js.map