"use strict";
/**
 * Sposify Import Service
 * Orchestrates the complete Spotify data import process
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
exports.SpotifyImportService = void 0;
exports.getSpotifyImportService = getSpotifyImportService;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const history_parser_1 = require("./history-parser");
const library_parser_1 = require("./library-parser");
const playlist_parser_1 = require("./playlist-parser");
const import_mapper_1 = require("./import-mapper");
const sposify_db_1 = require("../database/sposify-db");
class SpotifyImportService {
    historyParser = (0, history_parser_1.getHistoryParser)();
    libraryParser = (0, library_parser_1.getLibraryParser)();
    playlistParser = (0, playlist_parser_1.getPlaylistParser)();
    importMapper = (0, import_mapper_1.getImportMapper)();
    /**
     * Parse Spotify export files
     */
    parseExportFiles(filePaths) {
        // Separate files by type
        const historyFiles = filePaths.filter(f => {
            const name = path.basename(f);
            return name.startsWith('StreamingHistory') || name.includes('endsong');
        });
        const libraryFile = filePaths.find(f => path.basename(f).toLowerCase() === 'yourlibrary.json');
        const playlistFiles = filePaths.filter(f => path.basename(f).startsWith('Playlist') && f.endsWith('.json'));
        // Parse each type
        const historyResult = this.historyParser.parseFiles(historyFiles);
        const libraryResult = libraryFile
            ? this.libraryParser.parseLibraryFile(libraryFile)
            : { likedTracks: [], bannedTracks: [], errors: [] };
        const playlistResult = this.playlistParser.parseFiles(playlistFiles);
        // Combine errors
        const parseErrors = [
            ...historyResult.errors,
            ...libraryResult.errors,
            ...playlistResult.errors,
        ];
        return {
            history: historyResult.entries,
            likedTracks: libraryResult.likedTracks,
            playlists: playlistResult.playlists,
            bannedTracks: libraryResult.bannedTracks,
            parseErrors,
            stats: {
                totalHistoryEntries: historyResult.stats.totalEntries,
                uniqueTracksPlayed: historyResult.stats.uniqueTracks,
                totalPlaytimeMs: historyResult.stats.totalPlaytimeMs,
                dateRange: historyResult.stats.dateRange,
                likedTracksCount: libraryResult.likedTracks.length,
                playlistsCount: playlistResult.playlists.length,
            },
        };
    }
    /**
     * Parse Spotify export directory
     */
    parseExportDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }
        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.json'))
            .map(f => path.join(dirPath, f));
        return this.parseExportFiles(files);
    }
    /**
     * Match parsed data against Sposify database
     */
    matchParsedData(data, callbacks) {
        // Match liked tracks
        callbacks?.onProgress?.({
            phase: 'matching',
            progress: 0,
            currentItem: 'Matching liked tracks...',
        });
        const { matched: matchedLikedTracks, unmatched: unmatchedLikedTracks } = this.importMapper.matchAndConvertTracks(data.likedTracks, (p) => {
            callbacks?.onProgress?.({
                phase: 'matching',
                progress: p * 0.3,
                currentItem: 'Matching liked tracks...',
            });
        });
        // Match history
        callbacks?.onProgress?.({
            phase: 'matching',
            progress: 0.3,
            currentItem: 'Matching streaming history...',
        });
        const matchedHistory = this.importMapper.matchAndConvertHistory(data.history, (p) => {
            callbacks?.onProgress?.({
                phase: 'matching',
                progress: 0.3 + p * 0.4,
                currentItem: 'Matching streaming history...',
            });
        });
        // Match playlists
        callbacks?.onProgress?.({
            phase: 'matching',
            progress: 0.7,
            currentItem: 'Matching playlists...',
        });
        const matchedPlaylists = [];
        for (let i = 0; i < data.playlists.length; i++) {
            const playlist = data.playlists[i];
            const matched = this.importMapper.matchAndConvertPlaylist(playlist);
            matchedPlaylists.push(matched);
            callbacks?.onProgress?.({
                phase: 'matching',
                progress: 0.7 + (i / data.playlists.length) * 0.3,
                currentItem: `Matching playlist: ${playlist.name}`,
            });
        }
        // Calculate stats
        const likedTracksMatchRate = data.likedTracks.length > 0
            ? matchedLikedTracks.length / data.likedTracks.length
            : 0;
        const matchedHistoryCount = matchedHistory.filter(h => h.matchedSpotifyId).length;
        const historyMatchRate = matchedHistory.length > 0
            ? matchedHistoryCount / matchedHistory.length
            : 0;
        const averagePlaylistMatchRate = matchedPlaylists.length > 0
            ? matchedPlaylists.reduce((sum, p) => sum + p.matchRate, 0) / matchedPlaylists.length
            : 0;
        return {
            matchedLikedTracks,
            unmatchedLikedTracks,
            matchedHistory,
            matchedPlaylists,
            matchStats: {
                likedTracksMatchRate,
                historyMatchRate,
                averagePlaylistMatchRate,
            },
        };
    }
    /**
     * Execute the import with matched data
     */
    async executeImport(options, matchedData, callbacks) {
        const startTime = Date.now();
        const errors = [];
        let historyImported = 0;
        let tracksLiked = 0;
        let tracksDisliked = 0;
        let playlistsCreated = 0;
        const db = (0, sposify_db_1.getSposifyDatabase)();
        // Import liked tracks
        if (options.importLikedTracks) {
            callbacks?.onProgress?.({
                phase: 'importing',
                progress: 0,
                currentItem: 'Importing liked tracks...',
                stats: { imported: 0 },
            });
            for (let i = 0; i < matchedData.matchedLikedTracks.length; i++) {
                const matched = matchedData.matchedLikedTracks[i];
                try {
                    if (matched.confidence >= options.minConfidence) {
                        const unifiedTrack = this.importMapper.toUnifiedTrack(matched);
                        callbacks?.onTrackImported?.(unifiedTrack);
                        tracksLiked++;
                    }
                }
                catch (error) {
                    errors.push({
                        type: 'track',
                        item: matched.original.trackName,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
                if (i % 10 === 0) {
                    callbacks?.onProgress?.({
                        phase: 'importing',
                        progress: (i / matchedData.matchedLikedTracks.length) * 0.3,
                        currentItem: `Importing: ${matched.original.trackName}`,
                        stats: { imported: tracksLiked },
                    });
                }
            }
        }
        // Import streaming history
        if (options.importHistory) {
            callbacks?.onProgress?.({
                phase: 'importing',
                progress: 0.3,
                currentItem: 'Importing streaming history...',
            });
            const matchedEntries = matchedData.matchedHistory.filter(h => h.matchedSpotifyId && (h.matchConfidence || 0) >= options.minConfidence);
            for (let i = 0; i < matchedEntries.length; i++) {
                const entry = matchedEntries[i];
                try {
                    // Get track duration from database
                    const track = db.getTrackById(entry.matchedSpotifyId);
                    const totalDuration = track?.duration_ms || entry.msPlayed;
                    const listenEvent = this.importMapper.toListenEvent(entry, entry.matchedSpotifyId, totalDuration);
                    callbacks?.onListenRecorded?.(listenEvent);
                    historyImported++;
                }
                catch (error) {
                    errors.push({
                        type: 'history',
                        item: `${entry.artistName} - ${entry.trackName}`,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
                if (i % 100 === 0) {
                    callbacks?.onProgress?.({
                        phase: 'importing',
                        progress: 0.3 + (i / matchedEntries.length) * 0.4,
                        currentItem: `Recording history: ${entry.trackName}`,
                        stats: { imported: historyImported },
                    });
                }
            }
        }
        // Import playlists
        if (options.importPlaylists) {
            callbacks?.onProgress?.({
                phase: 'importing',
                progress: 0.7,
                currentItem: 'Creating playlists...',
            });
            for (let i = 0; i < matchedData.matchedPlaylists.length; i++) {
                const matched = matchedData.matchedPlaylists[i];
                try {
                    // Apply prefix
                    const namedPlaylist = {
                        ...matched,
                        name: options.playlistPrefix + matched.name,
                    };
                    const playlist = this.importMapper.toPlaylist(namedPlaylist);
                    callbacks?.onPlaylistCreated?.(playlist);
                    playlistsCreated++;
                }
                catch (error) {
                    errors.push({
                        type: 'playlist',
                        item: matched.name,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
                callbacks?.onProgress?.({
                    phase: 'importing',
                    progress: 0.7 + (i / matchedData.matchedPlaylists.length) * 0.3,
                    currentItem: `Creating playlist: ${matched.name}`,
                });
            }
        }
        callbacks?.onProgress?.({
            phase: 'complete',
            progress: 1,
            stats: {
                imported: historyImported + tracksLiked + playlistsCreated,
            },
        });
        return {
            historyImported,
            tracksLiked,
            tracksDisliked,
            playlistsCreated,
            errors,
            duration: Date.now() - startTime,
        };
    }
    /**
     * Full import flow: parse -> match -> import
     */
    async fullImport(filePaths, options, callbacks) {
        // Phase 1: Parse
        callbacks?.onProgress?.({ phase: 'parsing', progress: 0 });
        const parsed = this.parseExportFiles(filePaths);
        callbacks?.onProgress?.({ phase: 'parsing', progress: 1 });
        // Phase 2: Match
        const matched = this.matchParsedData(parsed, callbacks);
        // Phase 3: Import
        return await this.executeImport(options, {
            matchedLikedTracks: matched.matchedLikedTracks,
            matchedHistory: matched.matchedHistory,
            matchedPlaylists: matched.matchedPlaylists,
        }, callbacks);
    }
}
exports.SpotifyImportService = SpotifyImportService;
// Singleton
let instance = null;
function getSpotifyImportService() {
    if (!instance) {
        instance = new SpotifyImportService();
    }
    return instance;
}
//# sourceMappingURL=spotify-import-service.js.map