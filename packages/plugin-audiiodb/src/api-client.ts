/**
 * AudiioDB API Client
 *
 * HTTP client for communicating with the AudiioDB REST API.
 * Provides access to 256M tracks, 10M artists, and 20M albums.
 */

// API response types
export interface AudiioDBTrack {
  id: number;
  spotify_id: string;
  title: string;
  isrc?: string;
  duration_ms: number;
  popularity: number;
  explicit: boolean;
  track_number?: number;
  disc_number?: number;
  album_id?: number;
  album_title?: string;
  release_year?: number;
  // Audio analysis features
  bpm?: number;
  key?: number;
  mode?: number; // 0=minor, 1=major
  energy?: number;
  danceability?: number;
  valence?: number;
  loudness?: number;
  speechiness?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  // Relations
  artists: AudiioDBTrackArtist[];
  genres?: string[];
}

export interface AudiioDBTrackArtist {
  id: number;
  name: string;
  position: number;
}

export interface AudiioDBAlbum {
  id: number;
  spotify_id: string;
  title: string;
  album_type?: string;
  release_date?: string;
  release_year?: number;
  label?: string;
  upc?: string;
  popularity: number;
  track_count: number;
  image_url?: string;
  artists?: AudiioDBAlbumArtist[];
}

export interface AudiioDBAlbumArtist {
  id: number;
  name: string;
  position: number;
}

export interface AudiioDBAlbumWithTracks extends AudiioDBAlbum {
  tracks: AudiioDBTrack[];
}

export interface AudiioDBAlbumSummary {
  id: number;
  title: string;
  release_year?: number;
  album_type?: string;
}

export interface AudiioDBSingleSummary {
  id: number;
  title: string;
  release_year?: number;
}

export interface AudiioDBRelatedArtist {
  id: number;
  name: string;
  popularity: number;
}

export interface AudiioDBGenre {
  name: string;
  count: number;
}

export interface AudiioDBTopTrack {
  id: number;
  title: string;
  popularity: number;
}

export interface AudiioDBAppearance {
  id: number;
  title: string;
  album_type?: string;
}

export interface AudiioDBCompilation {
  id: number;
  title: string;
  release_year?: number;
}

export interface AudiioDBEP {
  id: number;
  title: string;
  release_year?: number;
}

export interface AudiioDBSimilarArtist {
  id: number;
  name: string;
  popularity: number;
  shared_genres?: string[];
}

export interface AudiioDBImage {
  url: string;
  width?: number;
  height?: number;
}

export interface AudiioDBImages {
  small?: string;
  medium?: string;
  large?: string;
}

export interface AudiioDBDiscography {
  albums: AudiioDBAlbumSummary[];
  singles: AudiioDBSingleSummary[];
  compilations: AudiioDBCompilation[];
  eps: AudiioDBEP[];
  appears_on: AudiioDBAppearance[];
}

export interface AudiioDBRelated {
  similar_artists: AudiioDBSimilarArtist[];
  related_genres: AudiioDBGenre[];
}

export interface AudiioDBStats {
  track_count: number;
  album_count: number;
  total_duration_hours: number;
  avg_popularity: number;
}

export interface AudiioDBExternalIds {
  spotify?: string;
  isrc?: string;
  upc?: string;
}

export interface AudiioDBMusicBrainz {
  id?: string;
}

export interface AudiioDBSocial {
  website?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

export interface AudiioDBArtist {
  id: number;
  spotify_id: string;
  name: string;
  popularity: number;
  follower_count: number;
  genres: string[];
  image_url?: string;
  images?: AudiioDBImages;
  // Extended info (when fetching details)
  bio?: string;
  monthly_listeners?: number;
  top_tracks?: AudiioDBTopTrack[];
  discography?: AudiioDBDiscography;
  related?: AudiioDBRelated;
  stats?: AudiioDBStats;
  external_ids?: AudiioDBExternalIds;
  musicbrainz?: AudiioDBMusicBrainz;
  social?: AudiioDBSocial;
}

export interface AudiioDBSearchResult {
  tracks: AudiioDBTrack[];
  artists: AudiioDBArtist[];
  albums: AudiioDBAlbum[];
  total_tracks: number;
  total_artists: number;
  total_albums: number;
}

export interface AudiioDBCharts {
  tracks: AudiioDBTrack[];
  artists: AudiioDBArtist[];
  albums: AudiioDBAlbum[];
}

export interface AudiioDBNewReleases {
  albums: AudiioDBAlbum[];
}

export interface AudiioDBSearchFilters {
  genre?: string;
  year_min?: number;
  year_max?: number;
  bpm_min?: number;
  bpm_max?: number;
  key?: number;
  mode?: number;
  energy_min?: number;
  energy_max?: number;
  danceability_min?: number;
  danceability_max?: number;
  explicit?: boolean;
}

export interface AudiioDBClientOptions {
  baseUrl?: string;
  timeout?: number;
}

const DEFAULT_BASE_URL = 'https://api.audiiodb.com';
const DEFAULT_TIMEOUT = 10000;

/**
 * AudiioDB API Client
 */
export class AudiioDBClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: AudiioDBClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Update the API base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Perform an HTTP request with timeout
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`AudiioDB API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Search across tracks, artists, and albums
   */
  async search(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: AudiioDBSearchFilters;
    } = {}
  ): Promise<AudiioDBSearchResult> {
    const params = new URLSearchParams({
      q: query,
      limit: String(options.limit || 25),
      offset: String(options.offset || 0),
    });

    // Add filters
    if (options.filters) {
      const f = options.filters;
      if (f.genre) params.set('genre', f.genre);
      if (f.year_min) params.set('year_min', String(f.year_min));
      if (f.year_max) params.set('year_max', String(f.year_max));
      if (f.bpm_min) params.set('bpm_min', String(f.bpm_min));
      if (f.bpm_max) params.set('bpm_max', String(f.bpm_max));
      if (f.key !== undefined) params.set('key', String(f.key));
      if (f.mode !== undefined) params.set('mode', String(f.mode));
      if (f.energy_min) params.set('energy_min', String(f.energy_min));
      if (f.energy_max) params.set('energy_max', String(f.energy_max));
      if (f.danceability_min) params.set('danceability_min', String(f.danceability_min));
      if (f.danceability_max) params.set('danceability_max', String(f.danceability_max));
      if (f.explicit !== undefined) params.set('explicit', String(f.explicit));
    }

    return this.request<AudiioDBSearchResult>(`/search?${params}`);
  }

  /**
   * Search with autocomplete (faster, smaller results)
   */
  async autocomplete(query: string, limit = 10): Promise<AudiioDBSearchResult> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.request<AudiioDBSearchResult>(`/search/autocomplete?${params}`);
  }

  /**
   * Get track by ID
   */
  async getTrack(id: number | string): Promise<AudiioDBTrack | null> {
    try {
      return await this.request<AudiioDBTrack>(`/tracks/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Get track by ISRC
   */
  async getTrackByIsrc(isrc: string): Promise<AudiioDBTrack | null> {
    try {
      return await this.request<AudiioDBTrack>(`/tracks/isrc/${isrc}`);
    } catch {
      return null;
    }
  }

  /**
   * Get track by Spotify ID
   */
  async getTrackBySpotifyId(spotifyId: string): Promise<AudiioDBTrack | null> {
    try {
      return await this.request<AudiioDBTrack>(`/tracks/spotify/${spotifyId}`);
    } catch {
      return null;
    }
  }

  /**
   * Batch lookup tracks
   */
  async getTracksBatch(ids: (number | string)[]): Promise<AudiioDBTrack[]> {
    if (ids.length === 0) return [];
    if (ids.length > 100) {
      throw new Error('Batch lookup limited to 100 tracks');
    }

    return this.request<AudiioDBTrack[]>('/tracks/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Get track audio analysis
   */
  async getTrackAnalysis(id: number | string): Promise<{
    bpm?: number;
    key?: number;
    mode?: number;
    energy?: number;
    danceability?: number;
    valence?: number;
    loudness?: number;
    speechiness?: number;
    acousticness?: number;
    instrumentalness?: number;
    liveness?: number;
  } | null> {
    try {
      return await this.request(`/tracks/${id}/analysis`);
    } catch {
      return null;
    }
  }

  /**
   * Get artist by ID
   */
  async getArtist(id: number | string): Promise<AudiioDBArtist | null> {
    try {
      return await this.request<AudiioDBArtist>(`/artists/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Get artist by Spotify ID
   */
  async getArtistBySpotifyId(spotifyId: string): Promise<AudiioDBArtist | null> {
    try {
      return await this.request<AudiioDBArtist>(`/artists/spotify/${spotifyId}`);
    } catch {
      return null;
    }
  }

  /**
   * Get artist's top tracks
   */
  async getArtistTopTracks(id: number | string, limit = 10): Promise<AudiioDBTrack[]> {
    try {
      return await this.request<AudiioDBTrack[]>(`/artists/${id}/tracks?limit=${limit}`);
    } catch {
      return [];
    }
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(
    id: number | string,
    options: { limit?: number; offset?: number; type?: string } = {}
  ): Promise<AudiioDBAlbum[]> {
    const params = new URLSearchParams({
      limit: String(options.limit || 50),
      offset: String(options.offset || 0),
    });
    if (options.type) params.set('type', options.type);

    try {
      return await this.request<AudiioDBAlbum[]>(`/artists/${id}/albums?${params}`);
    } catch {
      return [];
    }
  }

  /**
   * Get album by ID
   */
  async getAlbum(id: number | string): Promise<AudiioDBAlbum | null> {
    try {
      return await this.request<AudiioDBAlbum>(`/albums/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Get album by Spotify ID
   */
  async getAlbumBySpotifyId(spotifyId: string): Promise<AudiioDBAlbum | null> {
    try {
      return await this.request<AudiioDBAlbum>(`/albums/spotify/${spotifyId}`);
    } catch {
      return null;
    }
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(id: number | string): Promise<AudiioDBTrack[]> {
    try {
      return await this.request<AudiioDBTrack[]>(`/albums/${id}/tracks`);
    } catch {
      return [];
    }
  }

  /**
   * Get trending/chart tracks
   */
  async getCharts(limit = 50): Promise<AudiioDBCharts> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request<AudiioDBCharts>(`/charts/tracks?${params}`);
  }

  /**
   * Get new album releases
   */
  async getNewReleases(limit = 50): Promise<AudiioDBNewReleases> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request<AudiioDBNewReleases>(`/charts/albums?${params}`);
  }

  /**
   * Get artwork URL
   */
  getArtworkUrl(type: 'track' | 'album' | 'artist', id: number | string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    return `${this.baseUrl}/artwork/${type}/${id}?size=${size}`;
  }
}

// Default client instance
export const audiioDBClient = new AudiioDBClient();
