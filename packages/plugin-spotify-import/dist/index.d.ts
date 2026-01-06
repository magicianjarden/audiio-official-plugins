/**
 * Spotify Import Plugin
 *
 * Import playlists and liked songs from Spotify.
 * Uses OAuth2 for authentication.
 *
 * How it works:
 * 1. User authenticates with Spotify OAuth
 * 2. Plugin fetches user's playlists and liked songs
 * 3. Tracks are matched in Audiio's library or via stream providers
 * 4. Playlists are created in Audiio
 */
import type { AddonManifest } from '@audiio/sdk';
interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string | null;
    images: Array<{
        url: string;
        width: number;
        height: number;
    }>;
    owner: {
        id: string;
        display_name: string;
    };
    tracks: {
        total: number;
    };
    public: boolean;
}
export interface ImportedTrack {
    title: string;
    artist: string;
    album: string;
    duration: number;
    isrc?: string;
    spotifyId: string;
    popularity: number;
    artwork?: string;
}
export interface ImportResult {
    playlist?: {
        name: string;
        description?: string;
        trackCount: number;
    };
    tracks: ImportedTrack[];
    matched: number;
    unmatched: number;
}
export declare class SpotifyImportPlugin {
    readonly id = "spotify-import";
    readonly name = "Spotify Import";
    readonly manifest: AddonManifest;
    private clientId;
    private clientSecret;
    private redirectUri;
    private tokens;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    updateSettings(settings: Record<string, unknown>): void;
    getSettings(): Record<string, unknown>;
    configure(options: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    }): void;
    isConfigured(): boolean;
    getAuthUrl(): string | null;
    handleCallback(code: string): Promise<boolean>;
    private refreshToken;
    private getAccessToken;
    isAuthenticated(): boolean;
    disconnect(): void;
    private spotifyFetch;
    getPlaylists(): Promise<SpotifyPlaylist[]>;
    importPlaylist(playlistId: string): Promise<ImportResult>;
    importLikedSongs(maxCount?: number): Promise<ImportResult>;
    getFollowedArtists(): Promise<Array<{
        id: string;
        name: string;
        genres: string[];
    }>>;
    private convertTrack;
}
export default SpotifyImportPlugin;
