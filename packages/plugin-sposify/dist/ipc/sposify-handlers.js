"use strict";
/**
 * Sposify IPC Handlers
 * Registers all IPC handlers for the Sposify addon
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMainWindow = setMainWindow;
exports.registerSposifyHandlers = registerSposifyHandlers;
exports.unregisterSposifyHandlers = unregisterSposifyHandlers;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sposify_db_1 = require("../database/sposify-db");
const playlist_db_1 = require("../database/playlist-db");
const audio_features_db_1 = require("../database/audio-features-db");
const isrc_matcher_1 = require("../database/isrc-matcher");
const spotify_import_service_1 = require("../import/spotify-import-service");
let mainWindow = null;
let storedUserDataPath = null;
/**
 * Set the main window for sending events
 */
function setMainWindow(window) {
    mainWindow = window;
}
/**
 * Send progress updates to renderer
 */
function sendProgress(progress) {
    mainWindow?.webContents.send('sposify:import-progress', progress);
}
/**
 * Send setup progress updates to renderer
 */
function sendSetupProgress(progress) {
    mainWindow?.webContents.send('sposify:setup-progress', progress);
}
/**
 * Register all Sposify IPC handlers
 */
function registerSposifyHandlers(userDataPath) {
    storedUserDataPath = userDataPath;
    const dbPath = path.join(userDataPath, 'sposify');
    // Ensure sposify directory exists
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
    }
    // ============================================================================
    // Database Management
    // ============================================================================
    electron_1.ipcMain.handle('sposify:init', async () => {
        try {
            const db = (0, sposify_db_1.getSposifyDatabase)();
            return await db.initialize(userDataPath, {
                onProgress: sendSetupProgress,
            });
        }
        catch (error) {
            console.error('[Sposify] Init error:', error);
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
    });
    electron_1.ipcMain.handle('sposify:rebuild-database', async () => {
        try {
            const db = (0, sposify_db_1.getSposifyDatabase)();
            db.close();
            return await db.initialize(userDataPath, {
                onProgress: sendSetupProgress,
                forceRebuild: true,
            });
        }
        catch (error) {
            console.error('[Sposify] Rebuild error:', error);
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
    });
    electron_1.ipcMain.handle('sposify:get-status', () => {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        return db.getStatus();
    });
    electron_1.ipcMain.handle('sposify:close', () => {
        (0, sposify_db_1.closeSposifyDatabase)();
    });
    // ============================================================================
    // File Selection
    // ============================================================================
    electron_1.ipcMain.handle('sposify:select-export-files', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Select Spotify Export Files',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result.canceled)
            return null;
        return result.filePaths;
    });
    electron_1.ipcMain.handle('sposify:select-export-folder', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Select Spotify Export Folder',
            properties: ['openDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    // ============================================================================
    // Import Operations
    // ============================================================================
    electron_1.ipcMain.handle('sposify:parse-export', async (_event, filePaths) => {
        const importService = (0, spotify_import_service_1.getSpotifyImportService)();
        return importService.parseExportFiles(filePaths);
    });
    electron_1.ipcMain.handle('sposify:parse-export-folder', async (_event, folderPath) => {
        const importService = (0, spotify_import_service_1.getSpotifyImportService)();
        return importService.parseExportDirectory(folderPath);
    });
    electron_1.ipcMain.handle('sposify:match-tracks', async (_event, tracks) => {
        const importService = (0, spotify_import_service_1.getSpotifyImportService)();
        const normalized = tracks.map(t => ({
            trackName: t.trackName,
            artistName: t.artistName,
            albumName: t.albumName,
        }));
        const result = importService.matchParsedData({
            history: [],
            likedTracks: normalized,
            playlists: [],
            bannedTracks: [],
            parseErrors: [],
            stats: {
                totalHistoryEntries: 0,
                uniqueTracksPlayed: 0,
                totalPlaytimeMs: 0,
                dateRange: null,
                likedTracksCount: normalized.length,
                playlistsCount: 0,
            },
        });
        return {
            matched: result.matchedLikedTracks,
            unmatched: result.unmatchedLikedTracks,
            matchRate: result.matchStats.likedTracksMatchRate,
        };
    });
    electron_1.ipcMain.handle('sposify:import-to-library', async (_event, data) => {
        const importService = (0, spotify_import_service_1.getSpotifyImportService)();
        // Note: The actual store integration happens in the renderer process
        // This just validates and processes the data
        return await importService.executeImport(data.options, {
            matchedLikedTracks: data.matchedLikedTracks || [],
            matchedHistory: data.matchedHistory || [],
            matchedPlaylists: data.matchedPlaylists || [],
        }, {
            onProgress: sendProgress,
        });
    });
    // ============================================================================
    // Audio Features
    // ============================================================================
    electron_1.ipcMain.handle('sposify:get-audio-features', (_event, spotifyId) => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        return audioDb.getBySpotifyId(spotifyId);
    });
    electron_1.ipcMain.handle('sposify:get-audio-features-batch', (_event, spotifyIds) => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        const result = audioDb.getBatch(spotifyIds);
        return Object.fromEntries(result);
    });
    electron_1.ipcMain.handle('sposify:get-features-by-isrc', (_event, isrc) => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        return audioDb.getByIsrc(isrc);
    });
    electron_1.ipcMain.handle('sposify:get-features-by-metadata', (_event, title, artist) => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        return audioDb.getByMetadata(title, artist);
    });
    electron_1.ipcMain.handle('sposify:find-similar-by-features', (_event, features, limit = 20) => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        return audioDb.findSimilar(features, limit);
    });
    // ============================================================================
    // ISRC Matching
    // ============================================================================
    electron_1.ipcMain.handle('sposify:match-by-metadata', (_event, tracks) => {
        const matcher = (0, isrc_matcher_1.getIsrcMatcher)();
        const result = matcher.matchTracks(tracks);
        return {
            matches: result.matches.map(m => ({
                localId: m.localId,
                spotifyId: m.spotifyId,
                confidence: m.confidence,
                matchedBy: m.matchedBy,
            })),
            unmatched: result.unmatched,
        };
    });
    electron_1.ipcMain.handle('sposify:enrich-track', (_event, localTrackId, spotifyId) => {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        const track = db.getTrackById(spotifyId);
        if (!track) {
            return { success: false };
        }
        const audioFeatures = audioDb.getBySpotifyId(spotifyId);
        const genres = track.genres ? JSON.parse(track.genres) : undefined;
        return {
            success: true,
            enrichedData: {
                genres,
                audioFeatures: audioFeatures || undefined,
                externalIds: {
                    spotify: spotifyId,
                    isrc: track.isrc || undefined,
                },
            },
        };
    });
    // ============================================================================
    // Playlist Discovery
    // ============================================================================
    electron_1.ipcMain.handle('sposify:search-playlists', (_event, query, options) => {
        const playlistDb = (0, playlist_db_1.getPlaylistDatabase)();
        return playlistDb.searchPlaylists(query, options);
    });
    electron_1.ipcMain.handle('sposify:browse-playlists', (_event, options) => {
        const playlistDb = (0, playlist_db_1.getPlaylistDatabase)();
        return playlistDb.browsePlaylists(options);
    });
    electron_1.ipcMain.handle('sposify:get-playlist', (_event, playlistId) => {
        const playlistDb = (0, playlist_db_1.getPlaylistDatabase)();
        return playlistDb.getPlaylist(playlistId);
    });
    electron_1.ipcMain.handle('sposify:get-top-playlists', (_event, limit = 100) => {
        const playlistDb = (0, playlist_db_1.getPlaylistDatabase)();
        return playlistDb.getTopPlaylists(limit);
    });
    electron_1.ipcMain.handle('sposify:get-playlists-for-track', (_event, spotifyId, limit = 10) => {
        const playlistDb = (0, playlist_db_1.getPlaylistDatabase)();
        return playlistDb.getPlaylistsContainingTrack(spotifyId, limit);
    });
    // ============================================================================
    // Track Queries
    // ============================================================================
    electron_1.ipcMain.handle('sposify:get-track', (_event, spotifyId) => {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        return db.getTrackById(spotifyId);
    });
    electron_1.ipcMain.handle('sposify:get-track-by-isrc', (_event, isrc) => {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        return db.getTrackByIsrc(isrc);
    });
    electron_1.ipcMain.handle('sposify:search-tracks', (_event, title, artist, limit = 10) => {
        const db = (0, sposify_db_1.getSposifyDatabase)();
        return db.searchTracks(title, artist, limit);
    });
    // ============================================================================
    // Configuration
    // ============================================================================
    electron_1.ipcMain.handle('sposify:set-config', (_event, config) => {
        const matcher = (0, isrc_matcher_1.getIsrcMatcher)();
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        if (config.minMatchConfidence !== undefined) {
            matcher.setMinConfidence(config.minMatchConfidence);
        }
        if (config.enableFuzzyMatching !== undefined) {
            matcher.setFuzzyMatchingEnabled(config.enableFuzzyMatching);
        }
        if (config.maxCacheSize !== undefined) {
            audioDb.setMaxCacheSize(config.maxCacheSize * 100); // Convert MB to entries approx
        }
    });
    electron_1.ipcMain.handle('sposify:clear-cache', () => {
        const audioDb = (0, audio_features_db_1.getAudioFeaturesDatabase)();
        audioDb.clearCache();
    });
    console.log('[Sposify] IPC handlers registered');
}
/**
 * Unregister all Sposify IPC handlers
 */
function unregisterSposifyHandlers() {
    const channels = [
        'sposify:init',
        'sposify:rebuild-database',
        'sposify:get-status',
        'sposify:close',
        'sposify:select-export-files',
        'sposify:select-export-folder',
        'sposify:parse-export',
        'sposify:parse-export-folder',
        'sposify:match-tracks',
        'sposify:import-to-library',
        'sposify:get-audio-features',
        'sposify:get-audio-features-batch',
        'sposify:get-features-by-isrc',
        'sposify:get-features-by-metadata',
        'sposify:find-similar-by-features',
        'sposify:match-by-metadata',
        'sposify:enrich-track',
        'sposify:search-playlists',
        'sposify:browse-playlists',
        'sposify:get-playlist',
        'sposify:get-top-playlists',
        'sposify:get-playlists-for-track',
        'sposify:get-track',
        'sposify:get-track-by-isrc',
        'sposify:search-tracks',
        'sposify:set-config',
        'sposify:clear-cache',
    ];
    for (const channel of channels) {
        electron_1.ipcMain.removeHandler(channel);
    }
    (0, sposify_db_1.closeSposifyDatabase)();
    console.log('[Sposify] IPC handlers unregistered');
}
//# sourceMappingURL=sposify-handlers.js.map