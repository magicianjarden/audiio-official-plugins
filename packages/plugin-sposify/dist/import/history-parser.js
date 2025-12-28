"use strict";
/**
 * Spotify Streaming History Parser
 * Parses StreamingHistory*.json and extended history files
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
exports.HistoryParser = void 0;
exports.getHistoryParser = getHistoryParser;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class HistoryParser {
    /**
     * Parse all streaming history files from a directory
     */
    parseDirectory(dirPath) {
        const entries = [];
        const errors = [];
        const seenTracks = new Set();
        let totalPlaytimeMs = 0;
        let skippedCount = 0;
        let minDate = null;
        let maxDate = null;
        // Find all streaming history files
        const files = fs.readdirSync(dirPath).filter(f => f.startsWith('StreamingHistory') && f.endsWith('.json'));
        // Also look for extended history
        const extendedFiles = fs.readdirSync(dirPath).filter(f => f.includes('endsong') && f.endsWith('.json'));
        // Parse regular streaming history
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const result = this.parseStreamingHistoryFile(filePath);
            entries.push(...result.entries);
            errors.push(...result.errors);
        }
        // Parse extended history (has more details)
        for (const file of extendedFiles) {
            const filePath = path.join(dirPath, file);
            const result = this.parseExtendedHistoryFile(filePath);
            entries.push(...result.entries);
            errors.push(...result.errors);
        }
        // Calculate stats
        for (const entry of entries) {
            const trackKey = `${entry.artistName}:::${entry.trackName}`;
            seenTracks.add(trackKey);
            totalPlaytimeMs += entry.msPlayed;
            if (entry.skipped)
                skippedCount++;
            if (!minDate || entry.endTime < minDate)
                minDate = entry.endTime;
            if (!maxDate || entry.endTime > maxDate)
                maxDate = entry.endTime;
        }
        // Sort by timestamp
        entries.sort((a, b) => a.endTime.localeCompare(b.endTime));
        return {
            entries,
            errors,
            stats: {
                totalEntries: entries.length,
                uniqueTracks: seenTracks.size,
                totalPlaytimeMs,
                dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
                skippedCount,
            },
        };
    }
    /**
     * Parse a single streaming history file
     */
    parseStreamingHistoryFile(filePath) {
        const entries = [];
        const errors = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            if (!Array.isArray(data)) {
                errors.push({
                    file: path.basename(filePath),
                    error: 'File does not contain an array',
                });
                return { entries, errors };
            }
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                if (!item.trackName || !item.artistName) {
                    // Skip podcast episodes or invalid entries
                    continue;
                }
                entries.push({
                    trackName: item.trackName,
                    artistName: item.artistName,
                    endTime: this.normalizeDate(item.endTime),
                    msPlayed: item.msPlayed || 0,
                    skipped: (item.msPlayed || 0) < 30000, // Less than 30 seconds
                });
            }
        }
        catch (error) {
            errors.push({
                file: path.basename(filePath),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        return { entries, errors };
    }
    /**
     * Parse extended streaming history file (more detailed)
     */
    parseExtendedHistoryFile(filePath) {
        const entries = [];
        const errors = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            if (!Array.isArray(data)) {
                errors.push({
                    file: path.basename(filePath),
                    error: 'File does not contain an array',
                });
                return { entries, errors };
            }
            for (const item of data) {
                // Skip podcast episodes
                if (item.episode_name || item.spotify_episode_uri) {
                    continue;
                }
                if (!item.master_metadata_track_name || !item.master_metadata_album_artist_name) {
                    continue;
                }
                entries.push({
                    trackName: item.master_metadata_track_name,
                    artistName: item.master_metadata_album_artist_name,
                    albumName: item.master_metadata_album_album_name || undefined,
                    endTime: item.ts,
                    msPlayed: item.ms_played || 0,
                    spotifyUri: item.spotify_track_uri || undefined,
                    skipped: item.skipped === true || (item.ms_played || 0) < 30000,
                });
            }
        }
        catch (error) {
            errors.push({
                file: path.basename(filePath),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        return { entries, errors };
    }
    /**
     * Parse streaming history from file paths
     */
    parseFiles(filePaths) {
        const allEntries = [];
        const allErrors = [];
        for (const filePath of filePaths) {
            if (path.basename(filePath).includes('endsong')) {
                const result = this.parseExtendedHistoryFile(filePath);
                allEntries.push(...result.entries);
                allErrors.push(...result.errors);
            }
            else if (path.basename(filePath).startsWith('StreamingHistory')) {
                const result = this.parseStreamingHistoryFile(filePath);
                allEntries.push(...result.entries);
                allErrors.push(...result.errors);
            }
        }
        // Calculate stats
        const seenTracks = new Set();
        let totalPlaytimeMs = 0;
        let skippedCount = 0;
        let minDate = null;
        let maxDate = null;
        for (const entry of allEntries) {
            seenTracks.add(`${entry.artistName}:::${entry.trackName}`);
            totalPlaytimeMs += entry.msPlayed;
            if (entry.skipped)
                skippedCount++;
            if (!minDate || entry.endTime < minDate)
                minDate = entry.endTime;
            if (!maxDate || entry.endTime > maxDate)
                maxDate = entry.endTime;
        }
        allEntries.sort((a, b) => a.endTime.localeCompare(b.endTime));
        return {
            entries: allEntries,
            errors: allErrors,
            stats: {
                totalEntries: allEntries.length,
                uniqueTracks: seenTracks.size,
                totalPlaytimeMs,
                dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
                skippedCount,
            },
        };
    }
    /**
     * Normalize date format
     */
    normalizeDate(dateStr) {
        // Handle "2024-01-15 14:30" format from regular history
        if (dateStr.includes(' ') && !dateStr.includes('T')) {
            return dateStr.replace(' ', 'T') + ':00Z';
        }
        // Already ISO format
        return dateStr;
    }
}
exports.HistoryParser = HistoryParser;
// Singleton
let instance = null;
function getHistoryParser() {
    if (!instance) {
        instance = new HistoryParser();
    }
    return instance;
}
//# sourceMappingURL=history-parser.js.map