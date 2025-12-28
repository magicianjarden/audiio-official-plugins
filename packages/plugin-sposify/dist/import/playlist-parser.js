"use strict";
/**
 * Spotify Playlist Parser
 * Parses Playlist*.json files from Spotify export
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
exports.PlaylistParser = void 0;
exports.getPlaylistParser = getPlaylistParser;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PlaylistParser {
    /**
     * Parse all playlist files from a directory
     */
    parseDirectory(dirPath) {
        const playlists = [];
        const errors = [];
        let totalTracks = 0;
        // Find all playlist files
        const files = fs.readdirSync(dirPath).filter(f => f.startsWith('Playlist') && f.endsWith('.json'));
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const result = this.parsePlaylistFile(filePath);
            if (result.playlist) {
                playlists.push(result.playlist);
                totalTracks += result.playlist.tracks.length;
            }
            errors.push(...result.errors);
        }
        return {
            playlists,
            errors,
            stats: {
                totalPlaylists: playlists.length,
                totalTracks,
                averageTracksPerPlaylist: playlists.length > 0
                    ? Math.round(totalTracks / playlists.length)
                    : 0,
            },
        };
    }
    /**
     * Parse a single playlist file
     */
    parsePlaylistFile(filePath) {
        const errors = [];
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            if (!data.name || !data.items) {
                errors.push({
                    file: path.basename(filePath),
                    error: 'Invalid playlist format: missing name or items',
                });
                return { playlist: null, errors };
            }
            const tracks = [];
            for (const item of data.items) {
                if (!item.track)
                    continue;
                const track = item.track;
                if (!track.trackName || !track.artistName)
                    continue;
                tracks.push({
                    trackName: track.trackName,
                    artistName: track.artistName,
                    albumName: track.albumName || undefined,
                    spotifyUri: track.trackUri,
                    spotifyId: this.extractSpotifyId(track.trackUri),
                });
            }
            const playlist = {
                name: data.name,
                description: data.description || undefined,
                tracks,
                lastModified: data.lastModifiedDate,
            };
            return { playlist, errors };
        }
        catch (error) {
            errors.push({
                file: path.basename(filePath),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return { playlist: null, errors };
        }
    }
    /**
     * Parse from file path list
     */
    parseFiles(filePaths) {
        const playlists = [];
        const errors = [];
        let totalTracks = 0;
        const playlistFiles = filePaths.filter(f => path.basename(f).startsWith('Playlist') && f.endsWith('.json'));
        for (const filePath of playlistFiles) {
            const result = this.parsePlaylistFile(filePath);
            if (result.playlist) {
                playlists.push(result.playlist);
                totalTracks += result.playlist.tracks.length;
            }
            errors.push(...result.errors);
        }
        return {
            playlists,
            errors,
            stats: {
                totalPlaylists: playlists.length,
                totalTracks,
                averageTracksPerPlaylist: playlists.length > 0
                    ? Math.round(totalTracks / playlists.length)
                    : 0,
            },
        };
    }
    /**
     * Extract Spotify ID from URI
     */
    extractSpotifyId(uri) {
        if (!uri)
            return undefined;
        const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
        return match ? match[1] : undefined;
    }
}
exports.PlaylistParser = PlaylistParser;
// Singleton
let instance = null;
function getPlaylistParser() {
    if (!instance) {
        instance = new PlaylistParser();
    }
    return instance;
}
//# sourceMappingURL=playlist-parser.js.map