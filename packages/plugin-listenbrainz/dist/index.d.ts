/**
 * ListenBrainz Scrobbler Plugin
 *
 * Provides scrobbling to ListenBrainz and importing listening history.
 * ListenBrainz is an open-source music tracking service.
 *
 * API Documentation: https://listenbrainz.readthedocs.io/en/latest/users/api/
 */
import type { Scrobbler, ScrobblePayload, NowPlayingPayload, AddonManifest } from '@audiio/sdk';
export declare class ListenBrainzProvider implements Scrobbler {
    readonly id = "listenbrainz";
    readonly name = "ListenBrainz";
    readonly requiresAuth = true;
    readonly manifest: AddonManifest;
    private token;
    private username;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    /**
     * Set the user token for authentication
     * Get your token from: https://listenbrainz.org/settings/
     */
    setToken(token: string): void;
    getToken(): string | null;
    clearToken(): void;
    updateSettings(settings: Record<string, unknown>): void;
    getSettings(): Record<string, unknown>;
    isAuthenticated(): boolean;
    validateToken(): Promise<{
        valid: boolean;
        username?: string;
        error?: string;
    }>;
    getUsername(): string | null;
    scrobble(payload: ScrobblePayload): Promise<boolean>;
    updateNowPlaying(payload: NowPlayingPayload): Promise<boolean>;
    submitFeedback(recordingMbid: string, score: 1 | -1 | 0): Promise<boolean>;
    /**
     * Import listening history from ListenBrainz
     */
    importListens(maxCount?: number): Promise<{
        tracks: Array<{
            title: string;
            artist: string;
            album?: string;
            playedAt: Date;
            mbid?: string;
        }>;
        error?: string;
    }>;
    /**
     * Import loved tracks from ListenBrainz
     */
    importLovedTracks(maxCount?: number): Promise<{
        tracks: Array<{
            title: string;
            artist: string;
            album?: string;
            mbid?: string;
        }>;
        error?: string;
    }>;
    getUserStats(range?: 'week' | 'month' | 'year' | 'all_time'): Promise<{
        totalListens?: number;
        topArtists?: Array<{
            name: string;
            count: number;
        }>;
        topTracks?: Array<{
            title: string;
            artist: string;
            count: number;
        }>;
    } | null>;
}
export default ListenBrainzProvider;
