/**
 * Spotify Playlist Parser
 * Parses Playlist*.json files from Spotify export
 */
import type { NormalizedPlaylist, ParseError } from '../types';
export interface PlaylistParseResult {
    playlists: NormalizedPlaylist[];
    errors: ParseError[];
    stats: {
        totalPlaylists: number;
        totalTracks: number;
        averageTracksPerPlaylist: number;
    };
}
export declare class PlaylistParser {
    /**
     * Parse all playlist files from a directory
     */
    parseDirectory(dirPath: string): PlaylistParseResult;
    /**
     * Parse a single playlist file
     */
    parsePlaylistFile(filePath: string): {
        playlist: NormalizedPlaylist | null;
        errors: ParseError[];
    };
    /**
     * Parse from file path list
     */
    parseFiles(filePaths: string[]): PlaylistParseResult;
    /**
     * Extract Spotify ID from URI
     */
    private extractSpotifyId;
}
export declare function getPlaylistParser(): PlaylistParser;
//# sourceMappingURL=playlist-parser.d.ts.map