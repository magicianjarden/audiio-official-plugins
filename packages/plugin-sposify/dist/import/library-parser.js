"use strict";
/**
 * Spotify Library Parser
 * Parses YourLibrary.json for liked tracks, albums, and artists
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
exports.LibraryParser = void 0;
exports.getLibraryParser = getLibraryParser;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LibraryParser {
    /**
     * Parse YourLibrary.json file
     */
    parseLibraryFile(filePath) {
        const result = {
            likedTracks: [],
            bannedTracks: [],
            likedAlbums: [],
            likedArtists: [],
            errors: [],
            stats: {
                likedTracksCount: 0,
                bannedTracksCount: 0,
                albumsCount: 0,
                artistsCount: 0,
            },
        };
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            // Parse liked tracks
            if (data.tracks && Array.isArray(data.tracks)) {
                for (const track of data.tracks) {
                    const normalized = this.normalizeLibraryTrack(track);
                    if (normalized) {
                        result.likedTracks.push(normalized);
                    }
                }
                result.stats.likedTracksCount = result.likedTracks.length;
            }
            // Parse banned/disliked tracks
            if (data.bannedTracks && Array.isArray(data.bannedTracks)) {
                for (const track of data.bannedTracks) {
                    const normalized = this.normalizeLibraryTrack(track);
                    if (normalized) {
                        result.bannedTracks.push(normalized);
                    }
                }
                result.stats.bannedTracksCount = result.bannedTracks.length;
            }
            // Parse liked albums
            if (data.albums && Array.isArray(data.albums)) {
                for (const album of data.albums) {
                    if (album.album && album.artist) {
                        result.likedAlbums.push({
                            name: album.album,
                            artist: album.artist,
                            spotifyUri: album.uri,
                        });
                    }
                }
                result.stats.albumsCount = result.likedAlbums.length;
            }
            // Parse followed artists
            if (data.artists && Array.isArray(data.artists)) {
                for (const artist of data.artists) {
                    if (artist.name) {
                        result.likedArtists.push({
                            name: artist.name,
                            spotifyUri: artist.uri,
                        });
                    }
                }
                result.stats.artistsCount = result.likedArtists.length;
            }
            // Parse banned artists (optional)
            if (data.bannedArtists && Array.isArray(data.bannedArtists)) {
                // Could be used for recommendations filtering
            }
        }
        catch (error) {
            result.errors.push({
                file: path.basename(filePath),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        return result;
    }
    /**
     * Find and parse YourLibrary.json from a directory
     */
    parseDirectory(dirPath) {
        const libraryFile = path.join(dirPath, 'YourLibrary.json');
        if (!fs.existsSync(libraryFile)) {
            return {
                likedTracks: [],
                bannedTracks: [],
                likedAlbums: [],
                likedArtists: [],
                errors: [{
                        file: 'YourLibrary.json',
                        error: 'File not found in the selected directory',
                    }],
                stats: {
                    likedTracksCount: 0,
                    bannedTracksCount: 0,
                    albumsCount: 0,
                    artistsCount: 0,
                },
            };
        }
        return this.parseLibraryFile(libraryFile);
    }
    /**
     * Parse from file path list
     */
    parseFiles(filePaths) {
        const libraryFile = filePaths.find(f => path.basename(f).toLowerCase() === 'yourlibrary.json');
        if (!libraryFile) {
            return {
                likedTracks: [],
                bannedTracks: [],
                likedAlbums: [],
                likedArtists: [],
                errors: [],
                stats: {
                    likedTracksCount: 0,
                    bannedTracksCount: 0,
                    albumsCount: 0,
                    artistsCount: 0,
                },
            };
        }
        return this.parseLibraryFile(libraryFile);
    }
    /**
     * Normalize a library track
     */
    normalizeLibraryTrack(track) {
        if (!track.track || !track.artist) {
            return null;
        }
        return {
            trackName: track.track,
            artistName: track.artist,
            albumName: track.album || undefined,
            spotifyUri: track.uri,
            spotifyId: this.extractSpotifyId(track.uri),
        };
    }
    /**
     * Extract Spotify ID from URI
     */
    extractSpotifyId(uri) {
        if (!uri)
            return undefined;
        // URI format: spotify:track:1234567890abcdef
        const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
        return match ? match[1] : undefined;
    }
}
exports.LibraryParser = LibraryParser;
// Singleton
let instance = null;
function getLibraryParser() {
    if (!instance) {
        instance = new LibraryParser();
    }
    return instance;
}
//# sourceMappingURL=library-parser.js.map