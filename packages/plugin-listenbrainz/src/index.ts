/**
 * ListenBrainz Scrobbler Plugin
 *
 * Provides scrobbling to ListenBrainz and importing listening history.
 * ListenBrainz is an open-source music tracking service.
 *
 * API Documentation: https://listenbrainz.readthedocs.io/en/latest/users/api/
 */

import type {
  Scrobbler,
  ScrobblePayload,
  NowPlayingPayload,
  AddonManifest,
  PrivacyManifest
} from '@audiio/sdk';

const LISTENBRAINZ_API = 'https://api.listenbrainz.org/1';
const USER_AGENT = 'Audiio/1.0.0 (https://github.com/audiio)';

// ============================================================================
// Types
// ============================================================================

interface ListenBrainzListen {
  listened_at?: number; // Required for 'single'/'import', must be omitted for 'playing_now'
  track_metadata: {
    artist_name: string;
    track_name: string;
    release_name?: string;
    additional_info?: {
      duration_ms?: number;
      recording_mbid?: string;
      release_mbid?: string;
      artist_mbids?: string[];
      isrc?: string;
      spotify_id?: string;
    };
  };
}

interface ListenBrainzSubmission {
  listen_type: 'single' | 'playing_now' | 'import';
  payload: ListenBrainzListen[];
}

interface ListenBrainzFeedback {
  recording_msid?: string;
  recording_mbid?: string;
  score: 1 | -1 | 0;
  user_id: string;
  created: number;
  track_metadata?: {
    artist_name: string;
    track_name: string;
    release_name?: string;
  };
}

// ============================================================================
// ListenBrainz Provider
// ============================================================================

export class ListenBrainzProvider implements Scrobbler {
  readonly id = 'listenbrainz';
  readonly name = 'ListenBrainz';
  readonly requiresAuth = true;

  readonly manifest: AddonManifest = {
    id: 'listenbrainz',
    name: 'ListenBrainz',
    version: '1.0.0',
    description: 'Scrobble your listens to ListenBrainz',
    author: 'Audiio',
    roles: ['scrobbler'],
    settingsSchema: [
      {
        key: 'token',
        label: 'User Token',
        description: 'Your ListenBrainz user token. Get it from listenbrainz.org/settings/',
        type: 'string',
        required: true,
        secret: true
      },
      {
        key: 'scrobblingEnabled',
        label: 'Enable Scrobbling',
        description: 'Automatically scrobble tracks as you listen',
        type: 'boolean',
        default: true
      },
      {
        key: 'nowPlayingEnabled',
        label: 'Now Playing Updates',
        description: 'Send "now playing" status when you start a track',
        type: 'boolean',
        default: true
      },
      {
        key: 'scrobbleThreshold',
        label: 'Scrobble Threshold (%)',
        description: 'Minimum percentage of track to play before scrobbling',
        type: 'number',
        default: 50,
        min: 10,
        max: 100
      }
    ],
    privacy: {
      collects: true,
      sharesWithThirdParties: true,
      tracksAcrossApps: false,

      dataAccess: [
        {
          category: 'listening-history',
          usage: ['service-functionality', 'third-party-sharing'],
          required: true,
          userFriendlyLabel: 'Listening History',
          userFriendlyDesc: 'Tracks you play and when you play them',
          technicalDesc: 'artist_name, track_name, release_name, listened_at (Unix timestamp), duration_ms'
        },
        {
          category: 'user-credentials',
          usage: ['service-functionality'],
          required: true,
          userFriendlyLabel: 'Account Token',
          userFriendlyDesc: 'Your ListenBrainz authentication token',
          technicalDesc: 'User token stored locally, sent via Authorization header'
        }
      ],

      networkAccess: [
        {
          host: 'api.listenbrainz.org',
          purpose: 'Submit listens and fetch statistics',
          dataTypes: ['listening-history', 'user-credentials']
        }
      ],

      localStorageUsed: true,
      localStorageDesc: 'Stores authentication token',
      dataRetention: 'third-party-controlled',
      lastUpdated: '2025-01-06'
    }
  };

  private token: string | null = null;
  private username: string | null = null;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async initialize(): Promise<void> {
    // Load token from settings if available
    console.log('[ListenBrainz] Plugin initialized');
  }

  async dispose(): Promise<void> {
    console.log('[ListenBrainz] Plugin disposed');
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set the user token for authentication
   * Get your token from: https://listenbrainz.org/settings/
   */
  setToken(token: string): void {
    this.token = token;
    this.username = null;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    this.username = null;
  }

  updateSettings(settings: Record<string, unknown>): void {
    if (typeof settings.token === 'string') {
      this.setToken(settings.token);
      console.log('[ListenBrainz] Token configured');
    }
  }

  getSettings(): Record<string, unknown> {
    return {
      token: this.token,
      username: this.username
    };
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async validateToken(): Promise<{ valid: boolean; username?: string; error?: string }> {
    if (!this.token) {
      return { valid: false, error: 'No token set' };
    }

    try {
      const response = await fetch(`${LISTENBRAINZ_API}/validate-token`, {
        headers: {
          'Authorization': `Token ${this.token}`,
          'User-Agent': USER_AGENT
        }
      });

      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json() as { valid: boolean; user_name?: string; message?: string };

      if (data.valid && data.user_name) {
        this.username = data.user_name;
        return { valid: true, username: data.user_name };
      }

      return { valid: false, error: data.message || 'Invalid token' };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  getUsername(): string | null {
    return this.username;
  }

  // ============================================================================
  // Scrobbling
  // ============================================================================

  async scrobble(payload: ScrobblePayload): Promise<boolean> {
    if (!this.token) {
      console.error('[ListenBrainz] Cannot scrobble: not authenticated');
      return false;
    }

    // ListenBrainz requires at least 50% of the track or 4 minutes played
    const minDuration = Math.min(payload.track.duration * 0.5, 240);
    if (payload.playedDuration < minDuration) {
      console.log('[ListenBrainz] Skipping scrobble: insufficient play duration');
      return false;
    }

    // Extract album name - handle both string and object formats
    const album = payload.track.album;
    const albumName = typeof album === 'string'
      ? album
      : (album as unknown as { title?: string } | undefined)?.title;

    const listen: ListenBrainzListen = {
      listened_at: Math.floor(payload.timestamp.getTime() / 1000),
      track_metadata: {
        artist_name: payload.track.artist,
        track_name: payload.track.title,
        release_name: albumName,
        additional_info: {
          duration_ms: payload.track.duration * 1000
        }
      }
    };

    const submission: ListenBrainzSubmission = {
      listen_type: 'single',
      payload: [listen]
    };

    try {
      const response = await fetch(`${LISTENBRAINZ_API}/submit-listens`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify(submission)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ListenBrainz] Scrobble failed:', response.status, error);
        return false;
      }

      console.log('[ListenBrainz] Scrobbled:', payload.track.title, 'by', payload.track.artist);
      return true;
    } catch (error) {
      console.error('[ListenBrainz] Scrobble error:', error);
      return false;
    }
  }

  async updateNowPlaying(payload: NowPlayingPayload): Promise<boolean> {
    if (!this.token) {
      console.log('[ListenBrainz] No token set - skipping now playing');
      return false;
    }

    console.log('[ListenBrainz] Sending now playing:', payload.track.title, 'by', payload.track.artist);

    // Extract album name - handle both string and object formats
    const album = payload.track.album;
    const albumName = typeof album === 'string'
      ? album
      : (album as unknown as { title?: string } | undefined)?.title;

    // Note: playing_now submissions must NOT include listened_at
    const listen = {
      track_metadata: {
        artist_name: payload.track.artist,
        track_name: payload.track.title,
        release_name: albumName,
        additional_info: {
          duration_ms: payload.track.duration * 1000
        }
      }
    };

    const submission: ListenBrainzSubmission = {
      listen_type: 'playing_now',
      payload: [listen]
    };

    try {
      const response = await fetch(`${LISTENBRAINZ_API}/submit-listens`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify(submission)
      });

      if (response.ok) {
        console.log('[ListenBrainz] Now playing sent successfully');
      } else {
        const errorText = await response.text();
        console.error('[ListenBrainz] Now playing failed:', response.status, errorText);
      }

      return response.ok;
    } catch (error) {
      console.error('[ListenBrainz] Now playing error:', error);
      return false;
    }
  }

  // ============================================================================
  // Feedback (Love/Hate)
  // ============================================================================

  async submitFeedback(recordingMbid: string, score: 1 | -1 | 0): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch(`${LISTENBRAINZ_API}/feedback/recording-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify({
          recording_mbid: recordingMbid,
          score
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Import (Additional Methods)
  // ============================================================================

  /**
   * Import listening history from ListenBrainz
   */
  async importListens(maxCount: number = 1000): Promise<{
    tracks: Array<{
      title: string;
      artist: string;
      album?: string;
      playedAt: Date;
      mbid?: string;
    }>;
    error?: string;
  }> {
    if (!this.token || !this.username) {
      const validation = await this.validateToken();
      if (!validation.valid) {
        return { tracks: [], error: 'Not authenticated' };
      }
    }

    const tracks: Array<{
      title: string;
      artist: string;
      album?: string;
      playedAt: Date;
      mbid?: string;
    }> = [];
    let count = 0;
    let maxTs: number | undefined;

    try {
      while (count < maxCount) {
        const url = new URL(`${LISTENBRAINZ_API}/user/${this.username}/listens`);
        url.searchParams.set('count', String(Math.min(100, maxCount - count)));
        if (maxTs) {
          url.searchParams.set('max_ts', String(maxTs));
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Token ${this.token}`,
            'User-Agent': USER_AGENT
          }
        });

        if (!response.ok) {
          break;
        }

        const data = await response.json() as {
          payload: {
            listens: ListenBrainzListen[];
          };
        };

        const listens = data.payload?.listens || [];
        if (listens.length === 0) {
          break;
        }

        for (const listen of listens) {
          tracks.push({
            title: listen.track_metadata.track_name,
            artist: listen.track_metadata.artist_name,
            album: listen.track_metadata.release_name,
            playedAt: new Date((listen.listened_at ?? 0) * 1000),
            mbid: listen.track_metadata.additional_info?.recording_mbid
          });
          count++;
        }

        maxTs = listens[listens.length - 1]!.listened_at ?? 0;
      }

      return { tracks };
    } catch (error) {
      return { tracks, error: String(error) };
    }
  }

  /**
   * Import loved tracks from ListenBrainz
   */
  async importLovedTracks(maxCount: number = 500): Promise<{
    tracks: Array<{
      title: string;
      artist: string;
      album?: string;
      mbid?: string;
    }>;
    error?: string;
  }> {
    if (!this.token || !this.username) {
      const validation = await this.validateToken();
      if (!validation.valid) {
        return { tracks: [], error: 'Not authenticated' };
      }
    }

    try {
      const url = new URL(`${LISTENBRAINZ_API}/feedback/user/${this.username}/get-feedback`);
      url.searchParams.set('count', String(maxCount));
      url.searchParams.set('score', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Token ${this.token}`,
          'User-Agent': USER_AGENT
        }
      });

      if (!response.ok) {
        return { tracks: [], error: `HTTP ${response.status}` };
      }

      const data = await response.json() as {
        feedback: ListenBrainzFeedback[];
      };

      const tracks = (data.feedback || [])
        .filter(f => f.track_metadata)
        .map(feedback => ({
          title: feedback.track_metadata!.track_name,
          artist: feedback.track_metadata!.artist_name,
          album: feedback.track_metadata!.release_name,
          mbid: feedback.recording_mbid
        }));

      return { tracks };
    } catch (error) {
      return { tracks: [], error: String(error) };
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getUserStats(range: 'week' | 'month' | 'year' | 'all_time' = 'all_time'): Promise<{
    totalListens?: number;
    topArtists?: Array<{ name: string; count: number }>;
    topTracks?: Array<{ title: string; artist: string; count: number }>;
  } | null> {
    if (!this.username) {
      return null;
    }

    try {
      const headers = { 'User-Agent': USER_AGENT };

      const countResponse = await fetch(`${LISTENBRAINZ_API}/user/${this.username}/listen-count`, { headers });
      const countData = await countResponse.json() as { payload: { count: number } };

      const artistsResponse = await fetch(
        `${LISTENBRAINZ_API}/stats/user/${this.username}/artists?range=${range}&count=10`,
        { headers }
      );
      const artistsData = await artistsResponse.json() as {
        payload: {
          artists: Array<{ artist_name: string; listen_count: number }>;
        };
      };

      const recordingsResponse = await fetch(
        `${LISTENBRAINZ_API}/stats/user/${this.username}/recordings?range=${range}&count=10`,
        { headers }
      );
      const recordingsData = await recordingsResponse.json() as {
        payload: {
          recordings: Array<{
            track_name: string;
            artist_name: string;
            listen_count: number;
          }>;
        };
      };

      return {
        totalListens: countData.payload?.count,
        topArtists: artistsData.payload?.artists?.map(a => ({
          name: a.artist_name,
          count: a.listen_count
        })),
        topTracks: recordingsData.payload?.recordings?.map(r => ({
          title: r.track_name,
          artist: r.artist_name,
          count: r.listen_count
        }))
      };
    } catch {
      return null;
    }
  }
}

export default ListenBrainzProvider;
