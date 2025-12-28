/**
 * Sposify Playlist Database Queries
 * Handles playlist browsing, searching, and retrieval
 */
import type { PlaylistPreview, PlaylistDetail, PlaylistSearchOptions, TrackInfo } from '../types';
export declare class PlaylistDatabase {
    /**
     * Search playlists by name or description
     */
    searchPlaylists(query: string, options?: PlaylistSearchOptions): {
        playlists: PlaylistPreview[];
        total: number;
        hasMore: boolean;
    };
    /**
     * Browse playlists by category or popularity
     */
    browsePlaylists(options?: PlaylistSearchOptions): {
        playlists: PlaylistPreview[];
        total: number;
        categories: string[];
    };
    /**
     * Get playlist by ID with tracks
     */
    getPlaylist(playlistId: string): PlaylistDetail | null;
    /**
     * Get playlist tracks
     */
    getPlaylistTracks(playlistId: string): TrackInfo[];
    /**
     * Get playlists containing a specific track
     */
    getPlaylistsContainingTrack(spotifyId: string, limit?: number): PlaylistPreview[];
    /**
     * Get top playlists by followers
     */
    getTopPlaylists(limit?: number): PlaylistPreview[];
    /**
     * Extract categories from playlist descriptions
     */
    private extractCategories;
}
export declare function getPlaylistDatabase(): PlaylistDatabase;
//# sourceMappingURL=playlist-db.d.ts.map