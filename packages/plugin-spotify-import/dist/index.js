"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyImportPlugin = void 0;
const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
// ============================================================================
// Spotify Import Plugin
// ============================================================================
class SpotifyImportPlugin {
    constructor() {
        this.id = 'spotify-import';
        this.name = 'Spotify Import';
        this.manifest = {
            id: 'spotify-import',
            name: 'Spotify Import',
            version: '1.0.0',
            description: 'Import playlists and liked songs from Spotify',
            author: 'Audiio',
            roles: ['tool', 'import-provider'],
            settingsSchema: [
                {
                    key: 'clientId',
                    label: 'Client ID',
                    description: 'Your Spotify app Client ID. Create an app at developer.spotify.com',
                    type: 'string',
                    required: true,
                    placeholder: 'Enter your Spotify Client ID'
                },
                {
                    key: 'clientSecret',
                    label: 'Client Secret',
                    description: 'Your Spotify app Client Secret',
                    type: 'string',
                    required: true,
                    secret: true,
                    placeholder: 'Enter your Spotify Client Secret'
                },
                {
                    key: 'redirectUri',
                    label: 'Redirect URI',
                    description: 'OAuth redirect URI (must match your Spotify app settings)',
                    type: 'string',
                    required: true,
                    default: 'http://localhost:3333/callback/spotify'
                }
            ],
            privacy: {
                collects: true,
                sharesWithThirdParties: true,
                tracksAcrossApps: false,
                dataAccess: [
                    {
                        category: 'user-credentials',
                        usage: ['service-functionality'],
                        required: true,
                        userFriendlyLabel: 'Spotify OAuth',
                        userFriendlyDesc: 'Authenticates with your Spotify account',
                        technicalDesc: 'OAuth2 tokens (access_token, refresh_token) stored locally'
                    },
                    {
                        category: 'library-data',
                        usage: ['service-functionality', 'third-party-sharing'],
                        required: true,
                        userFriendlyLabel: 'Spotify Library',
                        userFriendlyDesc: 'Your playlists, liked songs, and followed artists',
                        technicalDesc: 'Fetches user-library-read, playlist-read-private, user-follow-read scopes'
                    }
                ],
                networkAccess: [
                    {
                        host: 'accounts.spotify.com',
                        purpose: 'OAuth authentication',
                        dataTypes: ['user-credentials']
                    },
                    {
                        host: 'api.spotify.com',
                        purpose: 'Fetch playlists, liked songs, and followed artists',
                        dataTypes: ['library-data', 'user-credentials']
                    }
                ],
                localStorageUsed: true,
                localStorageDesc: 'Stores OAuth tokens for Spotify API access',
                dataRetention: 'persistent',
                lastUpdated: '2025-01-06'
            }
        };
        this.clientId = null;
        this.clientSecret = null;
        this.redirectUri = null;
        this.tokens = null;
    }
    // ============================================================================
    // Lifecycle
    // ============================================================================
    async initialize() {
        console.log('[SpotifyImport] Plugin initialized');
    }
    async dispose() {
        console.log('[SpotifyImport] Plugin disposed');
    }
    updateSettings(settings) {
        if (typeof settings.clientId === 'string') {
            this.clientId = settings.clientId;
        }
        if (typeof settings.clientSecret === 'string') {
            this.clientSecret = settings.clientSecret;
        }
        if (typeof settings.redirectUri === 'string') {
            this.redirectUri = settings.redirectUri;
        }
        if (settings.tokens && typeof settings.tokens === 'object') {
            this.tokens = settings.tokens;
        }
    }
    getSettings() {
        return {
            clientId: this.clientId,
            clientSecret: this.clientSecret ? '***' : null,
            redirectUri: this.redirectUri,
            isAuthenticated: this.isAuthenticated(),
            tokensExpireAt: this.tokens?.expiresAt
        };
    }
    // ============================================================================
    // Configuration
    // ============================================================================
    configure(options) {
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.redirectUri = options.redirectUri;
    }
    isConfigured() {
        return !!(this.clientId && this.clientSecret && this.redirectUri);
    }
    // ============================================================================
    // OAuth Authentication
    // ============================================================================
    getAuthUrl() {
        if (!this.isConfigured()) {
            return null;
        }
        const scopes = [
            'user-library-read',
            'playlist-read-private',
            'playlist-read-collaborative',
            'user-follow-read'
        ].join(' ');
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes,
            show_dialog: 'true'
        });
        return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
    }
    async handleCallback(code) {
        if (!this.isConfigured()) {
            return false;
        }
        try {
            const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.redirectUri
                })
            });
            if (!response.ok) {
                console.error('[SpotifyImport] Token exchange failed:', response.status);
                return false;
            }
            const data = await response.json();
            this.tokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + data.expires_in * 1000
            };
            console.log('[SpotifyImport] Successfully authenticated');
            return true;
        }
        catch (error) {
            console.error('[SpotifyImport] Callback error:', error);
            return false;
        }
    }
    async refreshToken() {
        if (!this.tokens?.refreshToken || !this.isConfigured()) {
            return false;
        }
        try {
            const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.tokens.refreshToken
                })
            });
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            this.tokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || this.tokens.refreshToken,
                expiresAt: Date.now() + data.expires_in * 1000
            };
            return true;
        }
        catch {
            return false;
        }
    }
    async getAccessToken() {
        if (!this.tokens) {
            return null;
        }
        // Refresh token if expired or about to expire (5 minute buffer)
        if (Date.now() >= this.tokens.expiresAt - 300000) {
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                return null;
            }
        }
        return this.tokens.accessToken;
    }
    isAuthenticated() {
        return this.tokens !== null;
    }
    disconnect() {
        this.tokens = null;
    }
    // ============================================================================
    // Spotify API
    // ============================================================================
    async spotifyFetch(endpoint) {
        const token = await this.getAccessToken();
        if (!token) {
            return null;
        }
        try {
            const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error('[SpotifyImport] API error:', response.status, endpoint);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            console.error('[SpotifyImport] Fetch error:', error);
            return null;
        }
    }
    async getPlaylists() {
        const playlists = [];
        let offset = 0;
        const limit = 50;
        while (true) {
            const data = await this.spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`);
            if (!data || data.items.length === 0) {
                break;
            }
            playlists.push(...data.items);
            offset += limit;
            if (offset >= data.total) {
                break;
            }
        }
        return playlists;
    }
    async importPlaylist(playlistId) {
        const tracks = [];
        let offset = 0;
        const limit = 100;
        let playlistInfo;
        // Get playlist info
        const playlist = await this.spotifyFetch(`/playlists/${playlistId}`);
        if (playlist) {
            playlistInfo = {
                name: playlist.name,
                description: playlist.description || undefined
            };
        }
        // Get tracks
        while (true) {
            const data = await this.spotifyFetch(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
            if (!data || data.items.length === 0) {
                break;
            }
            for (const item of data.items) {
                if (item.track) {
                    tracks.push(this.convertTrack(item.track));
                }
            }
            offset += limit;
            if (offset >= data.total) {
                break;
            }
        }
        return {
            playlist: playlistInfo ? {
                name: playlistInfo.name,
                description: playlistInfo.description,
                trackCount: tracks.length
            } : undefined,
            tracks,
            matched: 0,
            unmatched: tracks.length
        };
    }
    async importLikedSongs(maxCount = 500) {
        const tracks = [];
        let offset = 0;
        const limit = 50;
        while (tracks.length < maxCount) {
            const data = await this.spotifyFetch(`/me/tracks?limit=${limit}&offset=${offset}`);
            if (!data || data.items.length === 0) {
                break;
            }
            for (const item of data.items) {
                if (item.track) {
                    tracks.push(this.convertTrack(item.track));
                }
            }
            offset += limit;
            if (offset >= data.total || tracks.length >= maxCount) {
                break;
            }
        }
        return {
            tracks,
            matched: 0,
            unmatched: tracks.length
        };
    }
    async getFollowedArtists() {
        const artists = [];
        let after;
        while (true) {
            let url = '/me/following?type=artist&limit=50';
            if (after) {
                url += `&after=${after}`;
            }
            const data = await this.spotifyFetch(url);
            if (!data || data.artists.items.length === 0) {
                break;
            }
            artists.push(...data.artists.items.map(a => ({
                id: a.id,
                name: a.name,
                genres: a.genres
            })));
            if (!data.artists.cursors.after) {
                break;
            }
            after = data.artists.cursors.after;
        }
        return artists;
    }
    convertTrack(track) {
        return {
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            duration: Math.floor(track.duration_ms / 1000),
            isrc: track.external_ids?.isrc,
            spotifyId: track.id,
            popularity: track.popularity,
            artwork: track.album.images[0]?.url
        };
    }
}
exports.SpotifyImportPlugin = SpotifyImportPlugin;
exports.default = SpotifyImportPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7OztHQVdHOzs7QUFJSCxNQUFNLFdBQVcsR0FBRyw0QkFBNEIsQ0FBQztBQUNqRCxNQUFNLGdCQUFnQixHQUFHLDhCQUE4QixDQUFDO0FBb0V4RCwrRUFBK0U7QUFDL0Usd0JBQXdCO0FBQ3hCLCtFQUErRTtBQUUvRSxNQUFhLG1CQUFtQjtJQUFoQztRQUNXLE9BQUUsR0FBRyxnQkFBZ0IsQ0FBQztRQUN0QixTQUFJLEdBQUcsZ0JBQWdCLENBQUM7UUFFeEIsYUFBUSxHQUFrQjtZQUNqQyxFQUFFLEVBQUUsZ0JBQWdCO1lBQ3BCLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxFQUFFLCtDQUErQztZQUM1RCxNQUFNLEVBQUUsUUFBUTtZQUNoQixLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUM7WUFDbEMsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEdBQUcsRUFBRSxVQUFVO29CQUNmLEtBQUssRUFBRSxXQUFXO29CQUNsQixXQUFXLEVBQUUsb0VBQW9FO29CQUNqRixJQUFJLEVBQUUsUUFBUTtvQkFDZCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxXQUFXLEVBQUUsOEJBQThCO2lCQUM1QztnQkFDRDtvQkFDRSxHQUFHLEVBQUUsY0FBYztvQkFDbkIsS0FBSyxFQUFFLGVBQWU7b0JBQ3RCLFdBQVcsRUFBRSxnQ0FBZ0M7b0JBQzdDLElBQUksRUFBRSxRQUFRO29CQUNkLFFBQVEsRUFBRSxJQUFJO29CQUNkLE1BQU0sRUFBRSxJQUFJO29CQUNaLFdBQVcsRUFBRSxrQ0FBa0M7aUJBQ2hEO2dCQUNEO29CQUNFLEdBQUcsRUFBRSxhQUFhO29CQUNsQixLQUFLLEVBQUUsY0FBYztvQkFDckIsV0FBVyxFQUFFLDJEQUEyRDtvQkFDeEUsSUFBSSxFQUFFLFFB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Q0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pELEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDOUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSTtZQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDbkIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHO1NBQ3BDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFuZEQsa0RBbWRDO0FBRUQsa0JBQWUsbUJBQW1CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU3BvdGlmeSBJbXBvcnQgUGx1Z2luXHJcbiAqXHJcbiAqIEltcG9ydCBwbGF5bGlzdHMgYW5kIGxpa2VkIHNvbmdzIGZyb20gU3BvdGlmeS5cclxuICogVXNlcyBPQXV0aDIgZm9yIGF1dGhlbnRpY2F0aW9uLlxyXG4gKlxyXG4gKiBIb3cgaXQgd29ya3M6XHJcbiAqIDEuIFVzZXIgYXV0aGVudGljYXRlcyB3aXRoIFNwb3RpZnkgT0F1dGhcclxuICogMi4gUGx1Z2luIGZldGNoZXMgdXNlcidzIHBsYXlsaXN0cyBhbmQgbGlrZWQgc29uZ3NcclxuICogMy4gVHJhY2tzIGFyZSBtYXRjaGVkIGluIEF1ZGlpbydzIGxpYnJhcnkgb3IgdmlhIHN0cmVhbSBwcm92aWRlcnNcclxuICogNC4gUGxheWxpc3RzIGFyZSBjcmVhdGVkIGluIEF1ZGlpb1xyXG4gKi9cclxuXHJcbmltcG9ydCB0eXBlIHsgQWRkb25NYW5pZmVzdCwgUHJpdmFjeU1hbmlmZXN0IH0gZnJvbSAnQGF1ZGlpby9zZGsnO1xyXG5cclxuY29uc3QgU1BPVElGWV9BUEkgPSAnaHR0cHM6Ly9hcGkuc3BvdGlmeS5jb20vdjEnO1xyXG5jb25zdCBTUE9USUZZX0FDQ09VTlRTID0gJ2h0dHBzOi8vYWNjb3VudHMuc3BvdGlmeS5jb20nO1xyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4vLyBUeXBlc1xyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG5pbnRlcmZhY2UgU3BvdGlmeVRva2VucyB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzQXQ6IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFNwb3RpZnlUcmFjayB7XHJcbiAgaWQ6IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgYXJ0aXN0czogQXJyYXk8eyBpZDogc3RyaW5nOyBuYW1lOiBzdHJpbmcgfT47XHJcbiAgYWxidW06IHtcclxuICAgIGlkOiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBpbWFnZXM6IEFycmF5PHsgdXJsOiBzdHJpbmc7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0+O1xyXG4gICAgcmVsZWFzZV9kYXRlOiBzdHJpbmc7XHJcbiAgfTtcclxuICBkdXJhdGlvbl9tczogbnVtYmVyO1xyXG4gIGV4dGVybmFsX2lkcz86IHtcclxuICAgIGlzcmM/OiBzdHJpbmc7XHJcbiAgICBlYW4/OiBzdHJpbmc7XHJcbiAgICB1cGM/OiBzdHJpbmc7XHJcbiAgfTtcclxuICBwb3B1bGFyaXR5OiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTcG90aWZ5UGxheWxpc3Qge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcgfCBudWxsO1xyXG4gIGltYWdlczogQXJyYXk8eyB1cmw6IHN0cmluZzsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfT47XHJcbiAgb3duZXI6IHsgaWQ6IHN0cmluZzsgZGlzcGxheV9uYW1lOiBzdHJpbmcgfTtcclxuICB0cmFja3M6IHsgdG90YWw6IG51bWJlciB9O1xyXG4gIHB1YmxpYzogYm9vbGVhbjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFNwb3RpZnlQbGF5bGlzdEl0ZW0ge1xyXG4gIGFkZGVkX2F0OiBzdHJpbmc7XHJcbiAgdHJhY2s6IFNwb3RpZnlUcmFjayB8IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0ZWRUcmFjayB7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBhcnRpc3Q6IHN0cmluZztcclxuICBhbGJ1bTogc3RyaW5nO1xyXG4gIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgaXNyYz86IHN0cmluZztcclxuICBzcG90aWZ5SWQ6IHN0cmluZztcclxuICBwb3B1bGFyaXR5OiBudW1iZXI7XHJcbiAgYXJ0d29yaz86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRSZXN1bHQge1xyXG4gIHBsYXlsaXN0Pzoge1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgICB0cmFja0NvdW50OiBudW1iZXI7XHJcbiAgfTtcclxuICB0cmFja3M6IEltcG9ydGVkVHJhY2tbXTtcclxuICBtYXRjaGVkOiBudW1iZXI7XHJcbiAgdW5tYXRjaGVkOiBudW1iZXI7XHJcbn1cclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gU3BvdGlmeSBJbXBvcnQgUGx1Z2luXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmV4cG9ydCBjbGFzcyBTcG90aWZ5SW1wb3J0UGx1Z2luIHtcclxuICByZWFkb25seSBpZCA9ICdzcG90aWZ5LWltcG9ydCc7XHJcbiAgcmVhZG9ubHkgbmFtZSA9ICdTcG90aWZ5IEltcG9ydCc7XHJcblxyXG4gIHJlYWRvbmx5IG1hbmlmZXN0OiBBZGRvbk1hbmlmZXN0ID0ge1xyXG4gICAgaWQ6ICdzcG90aWZ5LWltcG9ydCcsXHJcbiAgICBuYW1lOiAnU3BvdGlmeSBJbXBvcnQnLFxyXG4gICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnSW1wb3J0IHBsYXlsaXN0cyBhbmQgbGlrZWQgc29uZ3MgZnJvbSBTcG90aWZ5JyxcclxuICAgIGF1dGhvcjogJ0F1ZGlpbycsXHJcbiAgICByb2xlczogWyd0b29sJywgJ2ltcG9ydC1wcm92aWRlciddLFxyXG4gICAgc2V0dGluZ3NTY2hlbWE6IFtcclxuICAgICAge1xyXG4gICAgICAgIGtleTogJ2NsaWVudElkJyxcclxuICAgICAgICBsYWJlbDogJ0NsaWVudCBJRCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdZb3VyIFNwb3RpZnkgYXBwIENsaWVudCBJRC4gQ3JlYXRlIGFuIGFwcCBhdCBkZXZlbG9wZXIuc3BvdGlmeS5jb20nLFxyXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnRW50ZXIgeW91ciBTcG90aWZ5IENsaWVudCBJRCdcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGtleTogJ2NsaWVudFNlY3JldCcsXHJcbiAgICAgICAgbGFiZWw6ICdDbGllbnQgU2VjcmV0JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1lvdXIgU3BvdGlmeSBhcHAgQ2xpZW50IFNlY3JldCcsXHJcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgc2VjcmV0OiB0cnVlLFxyXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnRW50ZXIgeW91ciBTcG90aWZ5IENsaWVudCBTZWNyZXQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBrZXk6ICdyZWRpcmVjdFVyaScsXHJcbiAgICAgICAgbGFiZWw6ICdSZWRpcmVjdCBVUkknLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnT0F1dGggcmVkaXJlY3QgVVJJIChtdXN0IG1hdGNoIHlvdXIgU3BvdGlmeSBhcHAgc2V0dGluZ3MpJyxcclxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICBkZWZhdWx0OiAnaHR0cDovL2xvY2FsaG9zdDozMzMzL2NhbGxiYWNrL3Nwb3RpZnknXHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBwcml2YWN5OiB7XHJcbiAgICAgIGNvbGxlY3RzOiB0cnVlLFxyXG4gICAgICBzaGFyZXNXaXRoVGhpcmRQYXJ0aWVzOiB0cnVlLFxyXG4gICAgICB0cmFja3NBY3Jvc3NBcHBzOiBmYWxzZSxcclxuXHJcbiAgICAgIGRhdGFBY2Nlc3M6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjYXRlZ29yeTogJ3VzZXItY3JlZGVudGlhbHMnLFxyXG4gICAgICAgICAgdXNhZ2U6IFsnc2VydmljZS1mdW5jdGlvbmFsaXR5J10sXHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIHVzZXJGcmllbmRseUxhYmVsOiAnU3BvdGlmeSBPQXV0aCcsXHJcbiAgICAgICAgICB1c2VyRnJpZW5kbHlEZXNjOiAnQXV0aGVudGljYXRlcyB3aXRoIHlvdXIgU3BvdGlmeSBhY2NvdW50JyxcclxuICAgICAgICAgIHRlY2huaWNhbERlc2M6ICdPQXV0aDIgdG9rZW5zIChhY2Nlc3NfdG9rZW4sIHJlZnJlc2hfdG9rZW4pIHN0b3JlZCBsb2NhbGx5J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2F0ZWdvcnk6ICdsaWJyYXJ5LWRhdGEnLFxyXG4gICAgICAgICAgdXNhZ2U6IFsnc2VydmljZS1mdW5jdGlvbmFsaXR5JywgJ3RoaXJkLXBhcnR5LXNoYXJpbmcnXSxcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgdXNlckZyaWVuZGx5TGFiZWw6ICdTcG90aWZ5IExpYnJhcnknLFxyXG4gICAgICAgICAgdXNlckZyaWVuZGx5RGVzYzogJ1lvdXIgcGxheWxpc3RzLCBsaWtlZCBzb25ncywgYW5kIGZvbGxvd2VkIGFydGlzdHMnLFxyXG4gICAgICAgICAgdGVjaG5pY2FsRGVzYzogJ0ZldGNoZXMgdXNlci1saWJyYXJ5LXJlYWQsIHBsYXlsaXN0LXJlYWQtcHJpdmF0ZSwgdXNlci1mb2xsb3ctcmVhZCBzY29wZXMnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG5cclxuICAgICAgbmV0d29ya0FjY2VzczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGhvc3Q6ICdhY2NvdW50cy5zcG90aWZ5LmNvbScsXHJcbiAgICAgICAgICBwdXJwb3NlOiAnT0F1dGggYXV0aGVudGljYXRpb24nLFxyXG4gICAgICAgICAgZGF0YVR5cGVzOiBbJ3VzZXItY3JlZGVudGlhbHMnXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaG9zdDogJ2FwaS5zcG90aWZ5LmNvbScsXHJcbiAgICAgICAgICBwdXJwb3NlOiAnRmV0Y2ggcGxheWxpc3RzLCBsaWtlZCBzb25ncywgYW5kIGZvbGxvd2VkIGFydGlzdHMnLFxyXG4gICAgICAgICAgZGF0YVR5cGVzOiBbJ2xpYnJhcnktZGF0YScsICd1c2VyLWNyZWRlbnRpYWxzJ11cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcblxyXG4gICAgICBsb2NhbFN0b3JhZ2VVc2VkOiB0cnVlLFxyXG4gICAgICBsb2NhbFN0b3JhZ2VEZXNjOiAnU3RvcmVzIE9BdXRoIHRva2VucyBmb3IgU3BvdGlmeSBBUEkgYWNjZXNzJyxcclxuICAgICAgZGF0YVJldGVudGlvbjogJ3BlcnNpc3RlbnQnLFxyXG4gICAgICBsYXN0VXBkYXRlZDogJzIwMjUtMDEtMDYnXHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgcHJpdmF0ZSBjbGllbnRJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgcHJpdmF0ZSBjbGllbnRTZWNyZXQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgcmVkaXJlY3RVcmk6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgdG9rZW5zOiBTcG90aWZ5VG9rZW5zIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBMaWZlY3ljbGVcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gIGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zb2xlLmxvZygnW1Nwb3RpZnlJbXBvcnRdIFBsdWdpbiBpbml0aWFsaXplZCcpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGlzcG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnNvbGUubG9nKCdbU3BvdGlmeUltcG9ydF0gUGx1Z2luIGRpc3Bvc2VkJyk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcclxuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MuY2xpZW50SWQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHRoaXMuY2xpZW50SWQgPSBzZXR0aW5ncy5jbGllbnRJZDtcclxuICAgIH1cclxuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MuY2xpZW50U2VjcmV0ID09PSAnc3RyaW5nJykge1xyXG4gICAgICB0aGlzLmNsaWVudFNlY3JldCA9IHNldHRpbmdzLmNsaWVudFNlY3JldDtcclxuICAgIH1cclxuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MucmVkaXJlY3RVcmkgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHRoaXMucmVkaXJlY3RVcmkgPSBzZXR0aW5ncy5yZWRpcmVjdFVyaTtcclxuICAgIH1cclxuICAgIGlmIChzZXR0aW5ncy50b2tlbnMgJiYgdHlwZW9mIHNldHRpbmdzLnRva2VucyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgdGhpcy50b2tlbnMgPSBzZXR0aW5ncy50b2tlbnMgYXMgU3BvdGlmeVRva2VucztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldFNldHRpbmdzKCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNsaWVudElkOiB0aGlzLmNsaWVudElkLFxyXG4gICAgICBjbGllbnRTZWNyZXQ6IHRoaXMuY2xpZW50U2VjcmV0ID8gJyoqKicgOiBudWxsLFxyXG4gICAgICByZWRpcmVjdFVyaTogdGhpcy5yZWRpcmVjdFVyaSxcclxuICAgICAgaXNBdXRoZW50aWNhdGVkOiB0aGlzLmlzQXV0aGVudGljYXRlZCgpLFxyXG4gICAgICB0b2tlbnNFeHBpcmVBdDogdGhpcy50b2tlbnM/LmV4cGlyZXNBdFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBDb25maWd1cmF0aW9uXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBjb25maWd1cmUob3B0aW9uczoge1xyXG4gICAgY2xpZW50SWQ6IHN0cmluZztcclxuICAgIGNsaWVudFNlY3JldDogc3RyaW5nO1xyXG4gICAgcmVkaXJlY3RVcmk6IHN0cmluZztcclxuICB9KTogdm9pZCB7XHJcbiAgICB0aGlzLmNsaWVudElkID0gb3B0aW9ucy5jbGllbnRJZDtcclxuICAgIHRoaXMuY2xpZW50U2VjcmV0ID0gb3B0aW9ucy5jbGllbnRTZWNyZXQ7XHJcbiAgICB0aGlzLnJlZGlyZWN0VXJpID0gb3B0aW9ucy5yZWRpcmVjdFVyaTtcclxuICB9XHJcblxyXG4gIGlzQ29uZmlndXJlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhISh0aGlzLmNsaWVudElkICYmIHRoaXMuY2xpZW50U2VjcmV0ICYmIHRoaXMucmVkaXJlY3RVcmkpO1xyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIE9BdXRoIEF1dGhlbnRpY2F0aW9uXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBnZXRBdXRoVXJsKCk6IHN0cmluZyB8IG51bGwge1xyXG4gICAgaWYgKCF0aGlzLmlzQ29uZmlndXJlZCgpKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNjb3BlcyA9IFtcclxuICAgICAgJ3VzZXItbGlicmFyeS1yZWFkJyxcclxuICAgICAgJ3BsYXlsaXN0LXJlYWQtcHJpdmF0ZScsXHJcbiAgICAgICdwbGF5bGlzdC1yZWFkLWNvbGxhYm9yYXRpdmUnLFxyXG4gICAgICAndXNlci1mb2xsb3ctcmVhZCdcclxuICAgIF0uam9pbignICcpO1xyXG5cclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBjbGllbnRfaWQ6IHRoaXMuY2xpZW50SWQhLFxyXG4gICAgICByZXNwb25zZV90eXBlOiAnY29kZScsXHJcbiAgICAgIHJlZGlyZWN0X3VyaTogdGhpcy5yZWRpcmVjdFVyaSEsXHJcbiAgICAgIHNjb3BlOiBzY29wZXMsXHJcbiAgICAgIHNob3dfZGlhbG9nOiAndHJ1ZSdcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBgJHtTUE9USUZZX0FDQ09VTlRTfS9hdXRob3JpemU/JHtwYXJhbXMudG9TdHJpbmcoKX1gO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgaGFuZGxlQ2FsbGJhY2soY29kZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBpZiAoIXRoaXMuaXNDb25maWd1cmVkKCkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7U1BPVElGWV9BQ0NPVU5UU30vYXBpL3Rva2VuYCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJhc2ljICR7QnVmZmVyLmZyb20oYCR7dGhpcy5jbGllbnRJZH06JHt0aGlzLmNsaWVudFNlY3JldH1gKS50b1N0cmluZygnYmFzZTY0Jyl9YFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgICAgICBncmFudF90eXBlOiAnYXV0aG9yaXphdGlvbl9jb2RlJyxcclxuICAgICAgICAgIGNvZGUsXHJcbiAgICAgICAgICByZWRpcmVjdF91cmk6IHRoaXMucmVkaXJlY3RVcmkhXHJcbiAgICAgICAgfSlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignW1Nwb3RpZnlJbXBvcnRdIFRva2VuIGV4Y2hhbmdlIGZhaWxlZDonLCByZXNwb25zZS5zdGF0dXMpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKSBhcyB7XHJcbiAgICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XHJcbiAgICAgICAgcmVmcmVzaF90b2tlbjogc3RyaW5nO1xyXG4gICAgICAgIGV4cGlyZXNfaW46IG51bWJlcjtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHRoaXMudG9rZW5zID0ge1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBkYXRhLmFjY2Vzc190b2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGRhdGEucmVmcmVzaF90b2tlbixcclxuICAgICAgICBleHBpcmVzQXQ6IERhdGUubm93KCkgKyBkYXRhLmV4cGlyZXNfaW4gKiAxMDAwXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnW1Nwb3RpZnlJbXBvcnRdIFN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1Nwb3RpZnlJbXBvcnRdIENhbGxiYWNrIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWZyZXNoVG9rZW4oKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBpZiAoIXRoaXMudG9rZW5zPy5yZWZyZXNoVG9rZW4gfHwgIXRoaXMuaXNDb25maWd1cmVkKCkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7U1BPVElGWV9BQ0NPVU5UU30vYXBpL3Rva2VuYCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJhc2ljICR7QnVmZmVyLmZyb20oYCR7dGhpcy5jbGllbnRJZH06JHt0aGlzLmNsaWVudFNlY3JldH1gKS50b1N0cmluZygnYmFzZTY0Jyl9YFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgICAgICBncmFudF90eXBlOiAncmVmcmVzaF90b2tlbicsXHJcbiAgICAgICAgICByZWZyZXNoX3Rva2VuOiB0aGlzLnRva2Vucy5yZWZyZXNoVG9rZW5cclxuICAgICAgICB9KVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkgYXMge1xyXG4gICAgICAgIGFjY2Vzc190b2tlbjogc3RyaW5nO1xyXG4gICAgICAgIGV4cGlyZXNfaW46IG51bWJlcjtcclxuICAgICAgICByZWZyZXNoX3Rva2VuPzogc3RyaW5nO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy50b2tlbnMgPSB7XHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGRhdGEuYWNjZXNzX3Rva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogZGF0YS5yZWZyZXNoX3Rva2VuIHx8IHRoaXMudG9rZW5zLnJlZnJlc2hUb2tlbixcclxuICAgICAgICBleHBpcmVzQXQ6IERhdGUubm93KCkgKyBkYXRhLmV4cGlyZXNfaW4gKiAxMDAwXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldEFjY2Vzc1Rva2VuKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xyXG4gICAgaWYgKCF0aGlzLnRva2Vucykge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZWZyZXNoIHRva2VuIGlmIGV4cGlyZWQgb3IgYWJvdXQgdG8gZXhwaXJlICg1IG1pbnV0ZSBidWZmZXIpXHJcbiAgICBpZiAoRGF0ZS5ub3coKSA+PSB0aGlzLnRva2Vucy5leHBpcmVzQXQgLSAzMDAwMDApIHtcclxuICAgICAgY29uc3QgcmVmcmVzaGVkID0gYXdhaXQgdGhpcy5yZWZyZXNoVG9rZW4oKTtcclxuICAgICAgaWYgKCFyZWZyZXNoZWQpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRva2Vucy5hY2Nlc3NUb2tlbjtcclxuICB9XHJcblxyXG4gIGlzQXV0aGVudGljYXRlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLnRva2VucyAhPT0gbnVsbDtcclxuICB9XHJcblxyXG4gIGRpc2Nvbm5lY3QoKTogdm9pZCB7XHJcbiAgICB0aGlzLnRva2VucyA9IG51bGw7XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gU3BvdGlmeSBBUElcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc3BvdGlmeUZldGNoPFQ+KGVuZHBvaW50OiBzdHJpbmcpOiBQcm9taXNlPFQgfCBudWxsPiB7XHJcbiAgICBjb25zdCB0b2tlbiA9IGF3YWl0IHRoaXMuZ2V0QWNjZXNzVG9rZW4oKTtcclxuICAgIGlmICghdG9rZW4pIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtTUE9USUZZX0FQSX0ke2VuZHBvaW50fWAsIHtcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0b2tlbn1gXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbU3BvdGlmeUltcG9ydF0gQVBJIGVycm9yOicsIHJlc3BvbnNlLnN0YXR1cywgZW5kcG9pbnQpO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpIGFzIFQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbU3BvdGlmeUltcG9ydF0gRmV0Y2ggZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFBsYXlsaXN0cygpOiBQcm9taXNlPFNwb3RpZnlQbGF5bGlzdFtdPiB7XHJcbiAgICBjb25zdCBwbGF5bGlzdHM6IFNwb3RpZnlQbGF5bGlzdFtdID0gW107XHJcbiAgICBsZXQgb2Zmc2V0ID0gMDtcclxuICAgIGNvbnN0IGxpbWl0ID0gNTA7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuc3BvdGlmeUZldGNoPHtcclxuICAgICAgICBpdGVtczogU3BvdGlmeVBsYXlsaXN0W107XHJcbiAgICAgICAgdG90YWw6IG51bWJlcjtcclxuICAgICAgfT4oYC9tZS9wbGF5bGlzdHM/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fWApO1xyXG5cclxuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEuaXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHBsYXlsaXN0cy5wdXNoKC4uLmRhdGEuaXRlbXMpO1xyXG4gICAgICBvZmZzZXQgKz0gbGltaXQ7XHJcblxyXG4gICAgICBpZiAob2Zmc2V0ID49IGRhdGEudG90YWwpIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwbGF5bGlzdHM7XHJcbiAgfVxyXG5cclxuICBhc3luYyBpbXBvcnRQbGF5bGlzdChwbGF5bGlzdElkOiBzdHJpbmcpOiBQcm9taXNlPEltcG9ydFJlc3VsdD4ge1xyXG4gICAgY29uc3QgdHJhY2tzOiBJbXBvcnRlZFRyYWNrW10gPSBbXTtcclxuICAgIGxldCBvZmZzZXQgPSAwO1xyXG4gICAgY29uc3QgbGltaXQgPSAxMDA7XHJcbiAgICBsZXQgcGxheWxpc3RJbmZvOiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAvLyBHZXQgcGxheWxpc3QgaW5mb1xyXG4gICAgY29uc3QgcGxheWxpc3QgPSBhd2FpdCB0aGlzLnNwb3RpZnlGZXRjaDxTcG90aWZ5UGxheWxpc3Q+KGAvcGxheWxpc3RzLyR7cGxheWxpc3RJZH1gKTtcclxuICAgIGlmIChwbGF5bGlzdCkge1xyXG4gICAgICBwbGF5bGlzdEluZm8gPSB7XHJcbiAgICAgICAgbmFtZTogcGxheWxpc3QubmFtZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogcGxheWxpc3QuZGVzY3JpcHRpb24gfHwgdW5kZWZpbmVkXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IHRyYWNrc1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuc3BvdGlmeUZldGNoPHtcclxuICAgICAgICBpdGVtczogU3BvdGlmeVBsYXlsaXN0SXRlbVtdO1xyXG4gICAgICAgIHRvdGFsOiBudW1iZXI7XHJcbiAgICAgIH0+KGAvcGxheWxpc3RzLyR7cGxheWxpc3RJZH0vdHJhY2tzP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH1gKTtcclxuXHJcbiAgICAgIGlmICghZGF0YSB8fCBkYXRhLml0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZGF0YS5pdGVtcykge1xyXG4gICAgICAgIGlmIChpdGVtLnRyYWNrKSB7XHJcbiAgICAgICAgICB0cmFja3MucHVzaCh0aGlzLmNvbnZlcnRUcmFjayhpdGVtLnRyYWNrKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBvZmZzZXQgKz0gbGltaXQ7XHJcblxyXG4gICAgICBpZiAob2Zmc2V0ID49IGRhdGEudG90YWwpIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHBsYXlsaXN0OiBwbGF5bGlzdEluZm8gPyB7XHJcbiAgICAgICAgbmFtZTogcGxheWxpc3RJbmZvLm5hbWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHBsYXlsaXN0SW5mby5kZXNjcmlwdGlvbixcclxuICAgICAgICB0cmFja0NvdW50OiB0cmFja3MubGVuZ3RoXHJcbiAgICAgIH0gOiB1bmRlZmluZWQsXHJcbiAgICAgIHRyYWNrcyxcclxuICAgICAgbWF0Y2hlZDogMCxcclxuICAgICAgdW5tYXRjaGVkOiB0cmFja3MubGVuZ3RoXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgaW1wb3J0TGlrZWRTb25ncyhtYXhDb3VudDogbnVtYmVyID0gNTAwKTogUHJvbWlzZTxJbXBvcnRSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHRyYWNrczogSW1wb3J0ZWRUcmFja1tdID0gW107XHJcbiAgICBsZXQgb2Zmc2V0ID0gMDtcclxuICAgIGNvbnN0IGxpbWl0ID0gNTA7XHJcblxyXG4gICAgd2hpbGUgKHRyYWNrcy5sZW5ndGggPCBtYXhDb3VudCkge1xyXG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5zcG90aWZ5RmV0Y2g8e1xyXG4gICAgICAgIGl0ZW1zOiBBcnJheTx7IGFkZGVkX2F0OiBzdHJpbmc7IHRyYWNrOiBTcG90aWZ5VHJhY2sgfT47XHJcbiAgICAgICAgdG90YWw6IG51bWJlcjtcclxuICAgICAgfT4oYC9tZS90cmFja3M/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fWApO1xyXG5cclxuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEuaXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBkYXRhLml0ZW1zKSB7XHJcbiAgICAgICAgaWYgKGl0ZW0udHJhY2spIHtcclxuICAgICAgICAgIHRyYWNrcy5wdXNoKHRoaXMuY29udmVydFRyYWNrKGl0ZW0udHJhY2spKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG9mZnNldCArPSBsaW1pdDtcclxuXHJcbiAgICAgIGlmIChvZmZzZXQgPj0gZGF0YS50b3RhbCB8fCB0cmFja3MubGVuZ3RoID49IG1heENvdW50KSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0cmFja3MsXHJcbiAgICAgIG1hdGNoZWQ6IDAsXHJcbiAgICAgIHVubWF0Y2hlZDogdHJhY2tzLmxlbmd0aFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldEZvbGxvd2VkQXJ0aXN0cygpOiBQcm9taXNlPEFycmF5PHsgaWQ6IHN0cmluZzsgbmFtZTogc3RyaW5nOyBnZW5yZXM6IHN0cmluZ1tdIH0+PiB7XHJcbiAgICBjb25zdCBhcnRpc3RzOiBBcnJheTx7IGlkOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZ2VucmVzOiBzdHJpbmdbXSB9PiA9IFtdO1xyXG4gICAgbGV0IGFmdGVyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgbGV0IHVybCA9ICcvbWUvZm9sbG93aW5nP3R5cGU9YXJ0aXN0JmxpbWl0PTUwJztcclxuICAgICAgaWYgKGFmdGVyKSB7XHJcbiAgICAgICAgdXJsICs9IGAmYWZ0ZXI9JHthZnRlcn1gO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5zcG90aWZ5RmV0Y2g8e1xyXG4gICAgICAgIGFydGlzdHM6IHtcclxuICAgICAgICAgIGl0ZW1zOiBBcnJheTx7IGlkOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZ2VucmVzOiBzdHJpbmdbXSB9PjtcclxuICAgICAgICAgIGN1cnNvcnM6IHsgYWZ0ZXI6IHN0cmluZyB8IG51bGwgfTtcclxuICAgICAgICB9O1xyXG4gICAgICB9Pih1cmwpO1xyXG5cclxuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEuYXJ0aXN0cy5pdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgYXJ0aXN0cy5wdXNoKC4uLmRhdGEuYXJ0aXN0cy5pdGVtcy5tYXAoYSA9PiAoe1xyXG4gICAgICAgIGlkOiBhLmlkLFxyXG4gICAgICAgIG5hbWU6IGEubmFtZSxcclxuICAgICAgICBnZW5yZXM6IGEuZ2VucmVzXHJcbiAgICAgIH0pKSk7XHJcblxyXG4gICAgICBpZiAoIWRhdGEuYXJ0aXN0cy5jdXJzb3JzLmFmdGVyKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGFmdGVyID0gZGF0YS5hcnRpc3RzLmN1cnNvcnMuYWZ0ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFydGlzdHM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnZlcnRUcmFjayh0cmFjazogU3BvdGlmeVRyYWNrKTogSW1wb3J0ZWRUcmFjayB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0aXRsZTogdHJhY2submFtZSxcclxuICAgICAgYXJ0aXN0OiB0cmFjay5hcnRpc3RzLm1hcChhID0+IGEubmFtZSkuam9pbignLCAnKSxcclxuICAgICAgYWxidW06IHRyYWNrLmFsYnVtLm5hbWUsXHJcbiAgICAgIGR1cmF0aW9uOiBNYXRoLmZsb29yKHRyYWNrLmR1cmF0aW9uX21zIC8gMTAwMCksXHJcbiAgICAgIGlzcmM6IHRyYWNrLmV4dGVybmFsX2lkcz8uaXNyYyxcclxuICAgICAgc3BvdGlmeUlkOiB0cmFjay5pZCxcclxuICAgICAgcG9wdWxhcml0eTogdHJhY2sucG9wdWxhcml0eSxcclxuICAgICAgYXJ0d29yazogdHJhY2suYWxidW0uaW1hZ2VzWzBdPy51cmxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBTcG90aWZ5SW1wb3J0UGx1Z2luO1xyXG4iXX0=