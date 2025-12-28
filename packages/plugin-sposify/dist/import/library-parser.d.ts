/**
 * Spotify Library Parser
 * Parses YourLibrary.json for liked tracks, albums, and artists
 */
import type { NormalizedTrack, ParseError } from '../types';
export interface LibraryParseResult {
    likedTracks: NormalizedTrack[];
    bannedTracks: NormalizedTrack[];
    likedAlbums: Array<{
        name: string;
        artist: string;
        spotifyUri?: string;
    }>;
    likedArtists: Array<{
        name: string;
        spotifyUri?: string;
    }>;
    errors: ParseError[];
    stats: {
        likedTracksCount: number;
        bannedTracksCount: number;
        albumsCount: number;
        artistsCount: number;
    };
}
export declare class LibraryParser {
    /**
     * Parse YourLibrary.json file
     */
    parseLibraryFile(filePath: string): LibraryParseResult;
    /**
     * Find and parse YourLibrary.json from a directory
     */
    parseDirectory(dirPath: string): LibraryParseResult;
    /**
     * Parse from file path list
     */
    parseFiles(filePaths: string[]): LibraryParseResult;
    /**
     * Normalize a library track
     */
    private normalizeLibraryTrack;
    /**
     * Extract Spotify ID from URI
     */
    private extractSpotifyId;
}
export declare function getLibraryParser(): LibraryParser;
//# sourceMappingURL=library-parser.d.ts.map