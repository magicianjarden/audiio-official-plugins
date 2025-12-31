/**
 * AudiioDB Metadata Provider
 *
 * Provides track, artist, and album metadata from AudiioDB - an open-source
 * music database with 256M tracks, 10M artists, and 20M albums.
 *
 * Features:
 * - Full-text search with typo tolerance (Meilisearch)
 * - ISRC and Spotify ID lookups
 * - Audio analysis data (BPM, key, energy, etc.)
 * - Sub-50ms response times
 */

import {
  BaseMetadataProvider,
  type MetadataSearchResult,
  type MetadataSearchOptions,
  type MetadataTrack,
  type Artist,
  type Album,
  type ArtworkSet,
  type ArtistDetail,
} from '@audiio/sdk';

import {
  AudiioDBClient,
  audiioDBClient,
  type AudiioDBTrack,
  type AudiioDBArtist,
  type AudiioDBAlbum,
} from './api-client';

/** Provider settings */
export interface AudiioDBProviderSettings {
  /** Base URL for AudiioDB API (default: https://api.audiiodb.com) */
  apiBaseUrl: string;
  /** Include audio analysis data in results */
  fetchAudioAnalysis: boolean;
  /** Include artwork URLs */
  fetchArtwork: boolean;
  /** Request timeout in ms */
  timeout: number;
}

const DEFAULT_SETTINGS: AudiioDBProviderSettings = {
  apiBaseUrl: 'https://api.audiiodb.com',
  fetchAudioAnalysis: true,
  fetchArtwork: true,
  timeout: 10000,
};

export class AudiioDBMetadataProvider extends BaseMetadataProvider {
  readonly id = 'audiiodb';
  readonly name = 'AudiioDB';
  readonly priority = 70; // Between MusicBrainz (60) and Deezer (80)

  private settings: AudiioDBProviderSettings = { ...DEFAULT_SETTINGS };
  private client: AudiioDBClient;

  constructor(options?: Partial<AudiioDBProviderSettings>) {
    super();
    this.settings = { ...DEFAULT_SETTINGS, ...options };
    this.client = new AudiioDBClient({
      baseUrl: this.settings.apiBaseUrl,
      timeout: this.settings.timeout,
    });
  }

  /**
   * Update provider settings
   */
  updateSettings(settings: Partial<AudiioDBProviderSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.client.setBaseUrl(this.settings.apiBaseUrl);
  }

  /**
   * Get current settings
   */
  getSettings(): Record<string, unknown> {
    return { ...this.settings } as Record<string, unknown>;
  }

  /**
   * Search for tracks, artists, and albums
   */
  async search(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult> {
    const limit = Math.min(options?.limit ?? 25, 100);
    const offset = options?.offset ?? 0;

    try {
      const result = await this.client.search(query, { limit, offset });

      return {
        tracks: result.tracks.map((t) => this.mapTrack(t)),
        artists: result.artists.map((a) => this.mapArtistSummary(a)),
        albums: result.albums.map((a) => this.mapAlbumSummary(a)),
      };
    } catch (error) {
      console.error('[AudiioDB] Search error:', error);
      return { tracks: [], artists: [], albums: [] };
    }
  }

  /**
   * Get track by AudiioDB ID
   */
  async getTrack(id: string): Promise<MetadataTrack | null> {
    try {
      const track = await this.client.getTrack(id);
      if (!track) return null;
      return this.mapTrack(track);
    } catch (error) {
      console.error('[AudiioDB] getTrack error:', error);
      return null;
    }
  }

  /**
   * Get track by ISRC (International Standard Recording Code)
   */
  async getTrackByIsrc(isrc: string): Promise<MetadataTrack | null> {
    try {
      const track = await this.client.getTrackByIsrc(isrc);
      if (!track) return null;
      return this.mapTrack(track);
    } catch (error) {
      console.error('[AudiioDB] getTrackByIsrc error:', error);
      return null;
    }
  }

  /**
   * Get track by Spotify ID
   */
  async getTrackBySpotifyId(spotifyId: string): Promise<MetadataTrack | null> {
    try {
      const track = await this.client.getTrackBySpotifyId(spotifyId);
      if (!track) return null;
      return this.mapTrack(track);
    } catch (error) {
      console.error('[AudiioDB] getTrackBySpotifyId error:', error);
      return null;
    }
  }

  /**
   * Get artist details including discography
   */
  async getArtist(id: string): Promise<ArtistDetail | null> {
    try {
      const artist = await this.client.getArtist(id);
      if (!artist) return null;

      // Get top tracks and albums in parallel
      const [topTracks, albums] = await Promise.all([
        this.client.getArtistTopTracks(id, 10),
        this.client.getArtistAlbums(id, { limit: 50 }),
      ]);

      // Categorize albums
      const albumsByType = {
        albums: [] as Album[],
        singles: [] as Album[],
        eps: [] as Album[],
        compilations: [] as Album[],
        appearsOn: [] as Album[],
      };

      for (const album of albums) {
        const mapped = this.mapAlbumSummary(album);
        const type = album.album_type?.toLowerCase();

        if (type === 'single') {
          albumsByType.singles.push(mapped);
        } else if (type === 'ep') {
          albumsByType.eps.push(mapped);
        } else if (type === 'compilation') {
          albumsByType.compilations.push(mapped);
        } else if (type === 'appears_on') {
          albumsByType.appearsOn.push(mapped);
        } else {
          albumsByType.albums.push(mapped);
        }
      }

      // Get similar artists if available
      const similarArtists: Artist[] = artist.related?.similar_artists?.map((sa) => ({
        id: String(sa.id),
        name: sa.name,
      })) || [];

      return {
        id: String(artist.id),
        name: artist.name,
        artwork: this.getArtistArtwork(artist),
        topTracks: topTracks.map((t) => this.mapTrack(t)),
        albums: albumsByType.albums,
        singles: albumsByType.singles,
        eps: albumsByType.eps,
        compilations: albumsByType.compilations,
        appearsOn: albumsByType.appearsOn,
        similarArtists,
      };
    } catch (error) {
      console.error('[AudiioDB] getArtist error:', error);
      return null;
    }
  }

  /**
   * Get album details with tracks
   */
  async getAlbum(id: string): Promise<(Album & { tracks: MetadataTrack[] }) | null> {
    try {
      const [album, tracks] = await Promise.all([
        this.client.getAlbum(id),
        this.client.getAlbumTracks(id),
      ]);

      if (!album) return null;

      return {
        id: String(album.id),
        title: album.title,
        releaseDate: album.release_date,
        artwork: this.getAlbumArtwork(album),
        artists: album.artists?.map((a) => ({
          id: String(a.id),
          name: a.name,
        })),
        tracks: tracks.map((t) => this.mapTrack(t)),
      };
    } catch (error) {
      console.error('[AudiioDB] getAlbum error:', error);
      return null;
    }
  }

  /**
   * Get chart/trending tracks
   */
  async getCharts(limit = 50): Promise<{
    tracks: MetadataTrack[];
    artists: Artist[];
    albums: Album[];
  }> {
    try {
      const charts = await this.client.getCharts(limit);

      return {
        tracks: charts.tracks.map((t) => this.mapTrack(t)),
        artists: charts.artists.map((a) => this.mapArtistSummary(a)),
        albums: charts.albums.map((a) => this.mapAlbumSummary(a)),
      };
    } catch (error) {
      console.error('[AudiioDB] getCharts error:', error);
      return { tracks: [], artists: [], albums: [] };
    }
  }

  /**
   * Get new album releases
   */
  async getNewReleases(limit = 50): Promise<Album[]> {
    try {
      const releases = await this.client.getNewReleases(limit);
      return releases.albums.map((a) => this.mapAlbumSummary(a));
    } catch (error) {
      console.error('[AudiioDB] getNewReleases error:', error);
      return [];
    }
  }

  /**
   * Get audio analysis for a track (BPM, key, energy, etc.)
   */
  async getAudioAnalysis(trackId: string): Promise<{
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
      return await this.client.getTrackAnalysis(trackId);
    } catch (error) {
      console.error('[AudiioDB] getAudioAnalysis error:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  private mapTrack(track: AudiioDBTrack): MetadataTrack {
    const artists: Artist[] = track.artists?.map((a) => ({
      id: String(a.id),
      name: a.name,
    })) || [{ id: 'unknown', name: 'Unknown Artist' }];

    const result: MetadataTrack = {
      id: String(track.id),
      title: track.title,
      artists,
      duration: Math.floor(track.duration_ms / 1000),
      explicit: track.explicit,
      _provider: 'audiiodb',
    };

    // Album info
    if (track.album_id && track.album_title) {
      result.album = {
        id: String(track.album_id),
        title: track.album_title,
        releaseDate: track.release_year ? String(track.release_year) : undefined,
      };
    }

    // Artwork
    if (this.settings.fetchArtwork && track.album_id) {
      result.artwork = {
        small: this.client.getArtworkUrl('album', track.album_id, 'small'),
        medium: this.client.getArtworkUrl('album', track.album_id, 'medium'),
        large: this.client.getArtworkUrl('album', track.album_id, 'large'),
      };
    }

    // External IDs
    result.externalIds = {
      audiiodb: String(track.id),
      spotify: track.spotify_id,
      isrc: track.isrc,
    };

    // Audio analysis (if available and enabled)
    if (this.settings.fetchAudioAnalysis && track.bpm !== undefined) {
      result.audioFeatures = {
        bpm: track.bpm,
        key: track.key,
        mode: track.mode,
        energy: track.energy,
        danceability: track.danceability,
        valence: track.valence,
        loudness: track.loudness,
        speechiness: track.speechiness,
        acousticness: track.acousticness,
        instrumentalness: track.instrumentalness,
        liveness: track.liveness,
      };
    }

    return result;
  }

  private mapArtistSummary(artist: AudiioDBArtist): Artist {
    return {
      id: String(artist.id),
      name: artist.name,
      artwork: this.getArtistArtwork(artist),
    };
  }

  private mapAlbumSummary(album: AudiioDBAlbum): Album {
    return {
      id: String(album.id),
      title: album.title,
      releaseDate: album.release_date,
      artwork: this.getAlbumArtwork(album),
      artists: album.artists?.map((a) => ({
        id: String(a.id),
        name: a.name,
      })),
    };
  }

  private getArtistArtwork(artist: AudiioDBArtist): ArtworkSet | undefined {
    if (!this.settings.fetchArtwork) return undefined;

    if (artist.images) {
      return {
        small: artist.images.small,
        medium: artist.images.medium,
        large: artist.images.large,
      };
    }

    if (artist.image_url) {
      return {
        medium: artist.image_url,
        large: artist.image_url,
      };
    }

    // Use API artwork endpoint
    return {
      small: this.client.getArtworkUrl('artist', artist.id, 'small'),
      medium: this.client.getArtworkUrl('artist', artist.id, 'medium'),
      large: this.client.getArtworkUrl('artist', artist.id, 'large'),
    };
  }

  private getAlbumArtwork(album: AudiioDBAlbum): ArtworkSet | undefined {
    if (!this.settings.fetchArtwork) return undefined;

    if (album.image_url) {
      return {
        medium: album.image_url,
        large: album.image_url,
      };
    }

    // Use API artwork endpoint
    return {
      small: this.client.getArtworkUrl('album', album.id, 'small'),
      medium: this.client.getArtworkUrl('album', album.id, 'medium'),
      large: this.client.getArtworkUrl('album', album.id, 'large'),
    };
  }
}

// Export default client for external use
export { audiioDBClient };
