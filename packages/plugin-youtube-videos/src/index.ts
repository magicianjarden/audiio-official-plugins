/**
 * YouTube Videos Provider
 * Provides music videos using Piped API (no auth required).
 */

import {
  BaseArtistEnrichmentProvider,
  type MusicVideo
} from '@audiio/sdk';

// Piped API instances (no auth required)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
];

interface PipedSearchResult {
  items: Array<{
    type: string;
    url: string;
    title: string;
    thumbnail: string;
    uploaderName: string;
    uploadedDate: string;
    duration: number;
    views: number;
  }>;
}

export class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'youtube-videos';
  readonly name = 'YouTube Music Videos';
  readonly enrichmentType = 'videos' as const;

  private cache = new Map<string, { data: MusicVideo[]; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes
  private currentInstance = 0;

  async initialize(): Promise<void> {
    console.log('[YouTube Videos] Initializing with Piped API...');
  }

  private async fetchWithFallback(path: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
      const instanceIndex = (this.currentInstance + i) % PIPED_INSTANCES.length;
      const instance = PIPED_INSTANCES[instanceIndex];

      try {
        const response = await fetch(`${instance}${path}`, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          this.currentInstance = instanceIndex;
          return response;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`[YouTube Videos] Instance ${instance} failed, trying next...`);
      }
    }

    throw lastError || new Error('All Piped instances failed');
  }

  async getArtistVideos(artistName: string, limit = 10): Promise<MusicVideo[]> {
    const cacheKey = `${artistName}-${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const searchQuery = `${artistName} official music video`;
      const response = await this.fetchWithFallback(
        `/search?q=${encodeURIComponent(searchQuery)}&filter=music_videos`
      );

      const data = (await response.json()) as PipedSearchResult;

      if (!data.items || data.items.length === 0) {
        // Try without filter
        const fallbackResponse = await this.fetchWithFallback(
          `/search?q=${encodeURIComponent(searchQuery)}&filter=videos`
        );
        const fallbackData = (await fallbackResponse.json()) as PipedSearchResult;
        data.items = fallbackData.items || [];
      }

      const videos: MusicVideo[] = data.items
        .filter((item) => item.type === 'stream')
        .slice(0, limit)
        .map((item) => {
          // Extract video ID from URL (format: /watch?v=VIDEO_ID)
          const videoId = item.url.replace('/watch?v=', '');
          return {
            id: videoId,
            title: item.title,
            thumbnail: item.thumbnail,
            publishedAt: item.uploadedDate || '',
            viewCount: item.views || 0,
            duration: this.formatDuration(item.duration),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            source: 'youtube',
          };
        });

      this.cache.set(cacheKey, { data: videos, timestamp: Date.now() });
      return videos;
    } catch (error) {
      console.error('[YouTube Videos] Failed:', error);
      return [];
    }
  }

  private formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export default YouTubeVideosProvider;
