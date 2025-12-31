import { BaseLyricsProvider } from '@audiio/sdk';
import type { LyricsQuery, LyricsSearchOptions, LyricsResult } from '@audiio/core';
import { ResponseCache } from './cache.js';

export interface LyricsServiceConfig {
  serviceUrl: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

interface ServiceLyrics {
  plain?: string;
  synced?: Array<{ time: number; text: string }>;
  source?: string;
  language?: string;
}

interface ServiceResponse {
  lyrics?: ServiceLyrics;
  confidence?: number;
  sources?: string[];
  cached?: boolean;
  error?: string;
}

export class MetadataServiceLyricsProvider extends BaseLyricsProvider {
  readonly id = 'metadata-service-lyrics';
  readonly name = 'Audiio Metadata Service Lyrics';
  readonly supportsSynced = true;

  private serviceUrl: string;
  private cache: ResponseCache;
  private cacheEnabled: boolean;

  constructor(config: LyricsServiceConfig) {
    super();
    this.serviceUrl = config.serviceUrl.replace(/\/$/, '');
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cache = new ResponseCache(config.cacheTTL ?? 3600);
  }

  async initialize(): Promise<void> {
    // Connection test is done by the metadata provider
  }

  async dispose(): Promise<void> {
    this.cache.clear();
  }

  async getLyrics(query: LyricsQuery, options?: LyricsSearchOptions): Promise<LyricsResult | null> {
    const { title, artist, trackId } = query;

    if (!title || !artist) {
      return null;
    }

    const cacheKey = `lyrics:${title}:${artist}`;

    if (this.cacheEnabled) {
      const cached = this.cache.get<LyricsResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      const params = new URLSearchParams({
        title,
        artist,
        ...(trackId && { track_id: trackId }),
        ...(options?.preferSynced && { synced: 'true' }),
      });

      const url = `${this.serviceUrl}/v1/lyrics?${params}`;
      const response = await this.fetchJson<ServiceResponse>(url);

      if (!response.lyrics) return null;

      const result = this.toLyricsResult(response.lyrics);

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Get lyrics failed:', error);
      return null;
    }
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

  private toLyricsResult(lyrics: ServiceLyrics): LyricsResult {
    return {
      plain: lyrics.plain,
      synced: lyrics.synced?.map((line) => ({
        time: line.time,
        text: line.text,
      })),
      source: lyrics.source || 'metadata-service',
    };
  }
}
