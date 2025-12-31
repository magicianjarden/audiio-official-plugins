import { BaseMetadataProvider } from '@audiio/sdk';
import type {
  MetadataSearchResult,
  MetadataSearchOptions,
  MetadataTrack,
  Artist,
  Album,
  ArtworkSet,
} from '@audiio/core';
import { ResponseCache } from './cache.js';

export interface MetadataServiceConfig {
  serviceUrl: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

interface ServiceTrack {
  id: string;
  title: string;
  artists: Array<{ id: string; name: string }>;
  album?: { id: string; title: string };
  duration?: number;
  explicit?: boolean;
  releaseDate?: string;
  genres?: string[];
  artwork?: ArtworkSet;
  isrc?: string;
  bpm?: number;
  key?: string;
  mode?: 'major' | 'minor';
  externalIds?: Record<string, string>;
}

interface ServiceArtist {
  id: string;
  name: string;
  bio?: string;
  artwork?: ArtworkSet;
  genres?: string[];
  followers?: number;
  externalIds?: Record<string, string>;
}

interface ServiceResponse<T> {
  data?: T;
  track?: T;
  artist?: T;
  album?: T;
  tracks?: T[];
  artists?: T[];
  confidence?: number;
  sources?: string[];
  cached?: boolean;
  error?: string;
}

export class MetadataServiceProvider extends BaseMetadataProvider {
  readonly id = 'metadata-service';
  readonly name = 'Audiio Metadata Service';
  readonly priority = 10; // High priority

  private serviceUrl: string;
  private cache: ResponseCache;
  private cacheEnabled: boolean;

  constructor(config: MetadataServiceConfig) {
    super();
    this.serviceUrl = config.serviceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cache = new ResponseCache(config.cacheTTL ?? 3600);
  }

  async initialize(): Promise<void> {
    // Test connection to service
    try {
      const response = await fetch(`${this.serviceUrl}/health`);
      if (!response.ok) {
        console.warn(`Metadata service health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Metadata service not reachable: ${error}`);
    }
  }

  async dispose(): Promise<void> {
    this.cache.clear();
  }

  async search(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult> {
    const cacheKey = `search:${query}:${options?.limit || 10}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<MetadataSearchResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      const limit = options?.limit || 10;
      const url = `${this.serviceUrl}/v1/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await this.fetchJson<ServiceResponse<ServiceTrack[]>>(url);

      const tracks = (response.tracks || []).map((t) => this.toMetadataTrack(t));

      const result: MetadataSearchResult = {
        tracks,
        artists: [],
        albums: [],
        total: tracks.length,
      };

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      return { tracks: [], artists: [], albums: [], total: 0 };
    }
  }

  async getTrack(id: string): Promise<MetadataTrack | null> {
    const cacheKey = `track:${id}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<MetadataTrack>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.serviceUrl}/v1/tracks/${encodeURIComponent(id)}`;
      const response = await this.fetchJson<ServiceResponse<ServiceTrack>>(url);

      if (!response.track) return null;

      const track = this.toMetadataTrack(response.track);

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, track);
      }

      return track;
    } catch (error) {
      console.error('Get track failed:', error);
      return null;
    }
  }

  async getTrackByQuery(title: string, artist: string): Promise<MetadataTrack | null> {
    const cacheKey = `track:query:${title}:${artist}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<MetadataTrack>(cacheKey);
      if (cached) return cached;
    }

    try {
      const params = new URLSearchParams({ title, artist });
      const url = `${this.serviceUrl}/v1/tracks/lookup?${params}`;
      const response = await this.fetchJson<ServiceResponse<ServiceTrack>>(url);

      if (!response.track) return null;

      const track = this.toMetadataTrack(response.track);

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, track);
      }

      return track;
    } catch (error) {
      console.error('Get track by query failed:', error);
      return null;
    }
  }

  async getArtist(id: string): Promise<Artist | null> {
    const cacheKey = `artist:${id}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<Artist>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.serviceUrl}/v1/artists/${encodeURIComponent(id)}`;
      const response = await this.fetchJson<ServiceResponse<ServiceArtist>>(url);

      if (!response.artist) return null;

      const artist = this.toArtist(response.artist);

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, artist);
      }

      return artist;
    } catch (error) {
      console.error('Get artist failed:', error);
      return null;
    }
  }

  async getArtistByName(name: string): Promise<Artist | null> {
    const cacheKey = `artist:name:${name}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<Artist>(cacheKey);
      if (cached) return cached;
    }

    try {
      const params = new URLSearchParams({ name });
      const url = `${this.serviceUrl}/v1/artists/lookup?${params}`;
      const response = await this.fetchJson<ServiceResponse<ServiceArtist>>(url);

      if (!response.artist) return null;

      const artist = this.toArtist(response.artist);

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, artist);
      }

      return artist;
    } catch (error) {
      console.error('Get artist by name failed:', error);
      return null;
    }
  }

  async getSimilarArtists(id: string, limit = 20): Promise<Artist[]> {
    const cacheKey = `artist:similar:${id}:${limit}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<Artist[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.serviceUrl}/v1/artists/${encodeURIComponent(id)}/similar?limit=${limit}`;
      const response = await this.fetchJson<ServiceResponse<ServiceArtist[]>>(url);

      const artists = (response.artists || []).map((a) => this.toArtist(a));

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, artists);
      }

      return artists;
    } catch (error) {
      console.error('Get similar artists failed:', error);
      return [];
    }
  }

  async getAlbum(id: string): Promise<(Album & { tracks: MetadataTrack[] }) | null> {
    // For now, return null as album endpoints aren't fully implemented
    // This would be similar to getTrack but for albums
    return null;
  }

  // Helper methods
  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private toMetadataTrack(track: ServiceTrack): MetadataTrack {
    return {
      id: track.id,
      title: track.title,
      artists: track.artists.map((a) => ({
        id: a.id,
        name: a.name,
      })),
      album: track.album
        ? {
            id: track.album.id,
            title: track.album.title,
          }
        : undefined,
      duration: track.duration,
      artwork: track.artwork,
      genres: track.genres,
      releaseDate: track.releaseDate,
      explicit: track.explicit,
      externalIds: track.externalIds,
      _provider: this.id,
    };
  }

  private toArtist(artist: ServiceArtist): Artist {
    return {
      id: artist.id,
      name: artist.name,
      bio: artist.bio,
      artwork: artist.artwork,
      genres: artist.genres,
      followers: artist.followers,
      externalUrls: {},
    };
  }
}
