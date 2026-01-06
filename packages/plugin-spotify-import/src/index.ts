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

import type { AddonManifest, PrivacyManifest } from '@audiio/sdk';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';

// ============================================================================
// Types
// ============================================================================

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
    release_date: string;
  };
  duration_ms: number;
  external_ids?: {
    isrc?: string;
    ean?: string;
    upc?: string;
  };
  popularity: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: Array<{ url: string; width: number; height: number }>;
  owner: { id: string; display_name: string };
  tracks: { total: number };
  public: boolean;
}

interface SpotifyPlaylistItem {
  added_at: string;
  track: SpotifyTrack | null;
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

// ============================================================================
// Spotify Import Plugin
// ============================================================================

export class SpotifyImportPlugin {
  readonly id = 'spotify-import';
  readonly name = 'Spotify Import';

  readonly manifest: AddonManifest = {
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

  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri: string | null = null;
  private tokens: SpotifyTokens | null = null;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[SpotifyImport] Plugin initialized');
  }

  async dispose(): Promise<void> {
    console.log('[SpotifyImport] Plugin disposed');
  }

  updateSettings(settings: Record<string, unknown>): void {
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
      this.tokens = settings.tokens as SpotifyTokens;
    }
  }

  getSettings(): Record<string, unknown> {
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

  configure(options: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): void {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  // ============================================================================
  // OAuth Authentication
  // ============================================================================

  getAuthUrl(): string | null {
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
      client_id: this.clientId!,
      response_type: 'code',
      redirect_uri: this.redirectUri!,
      scope: scopes,
      show_dialog: 'true'
    });

    return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<boolean> {
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
          redirect_uri: this.redirectUri!
        })
      });

      if (!response.ok) {
        console.error('[SpotifyImport] Token exchange failed:', response.status);
        return false;
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000
      };

      console.log('[SpotifyImport] Successfully authenticated');
      return true;
    } catch (error) {
      console.error('[SpotifyImport] Callback error:', error);
      return false;
    }
  }

  private async refreshToken(): Promise<boolean> {
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

      const data = await response.json() as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };

      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000
      };

      return true;
    } catch {
      return false;
    }
  }

  private async getAccessToken(): Promise<string | null> {
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

  isAuthenticated(): boolean {
    return this.tokens !== null;
  }

  disconnect(): void {
    this.tokens = null;
  }

  // ============================================================================
  // Spotify API
  // ============================================================================

  private async spotifyFetch<T>(endpoint: string): Promise<T | null> {
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

      return await response.json() as T;
    } catch (error) {
      console.error('[SpotifyImport] Fetch error:', error);
      return null;
    }
  }

  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    const playlists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const data = await this.spotifyFetch<{
        items: SpotifyPlaylist[];
        total: number;
      }>(`/me/playlists?limit=${limit}&offset=${offset}`);

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

  async importPlaylist(playlistId: string): Promise<ImportResult> {
    const tracks: ImportedTrack[] = [];
    let offset = 0;
    const limit = 100;
    let playlistInfo: { name: string; description?: string } | undefined;

    // Get playlist info
    const playlist = await this.spotifyFetch<SpotifyPlaylist>(`/playlists/${playlistId}`);
    if (playlist) {
      playlistInfo = {
        name: playlist.name,
        description: playlist.description || undefined
      };
    }

    // Get tracks
    while (true) {
      const data = await this.spotifyFetch<{
        items: SpotifyPlaylistItem[];
        total: number;
      }>(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);

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

  async importLikedSongs(maxCount: number = 500): Promise<ImportResult> {
    const tracks: ImportedTrack[] = [];
    let offset = 0;
    const limit = 50;

    while (tracks.length < maxCount) {
      const data = await this.spotifyFetch<{
        items: Array<{ added_at: string; track: SpotifyTrack }>;
        total: number;
      }>(`/me/tracks?limit=${limit}&offset=${offset}`);

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

  async getFollowedArtists(): Promise<Array<{ id: string; name: string; genres: string[] }>> {
    const artists: Array<{ id: string; name: string; genres: string[] }> = [];
    let after: string | undefined;

    while (true) {
      let url = '/me/following?type=artist&limit=50';
      if (after) {
        url += `&after=${after}`;
      }

      const data = await this.spotifyFetch<{
        artists: {
          items: Array<{ id: string; name: string; genres: string[] }>;
          cursors: { after: string | null };
        };
      }>(url);

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

  private convertTrack(track: SpotifyTrack): ImportedTrack {
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

export default SpotifyImportPlugin;
