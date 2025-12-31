/**
 * YouTube Videos Provider
 * Provides music videos from YouTube Data API v3.
 */

import {
  BaseArtistEnrichmentProvider,
  type MusicVideo
} from '@audiio/sdk';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      publishedAt: string;
      title: string;
      thumbnails: {
        default: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
  }>;
}

interface YouTubeVideoDetails {
  items: Array<{
    id: string;
    contentDetails: { duration: string };
    statistics: { viewCount: string };
  }>;
}

interface YouTubeSettings {
  apiKey: string;
}

export class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'youtube-videos';
  readonly name = 'YouTube Music Videos';
  readonly enrichmentType = 'videos' as const;

  private apiKey: string = '';
  private cache = new Map<string, { data: MusicVideo[]; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes

  async initialize(): Promise<void> {
    console.log('[YouTube Videos] Initializing...');
  }

  updateSettings(settings: Partial<YouTubeSettings>): void {
    if (settings.apiKey) {
      this.apiKey = settings.apiKey;
    }
  }

  async getArtistVideos(artistName: string, limit = 10): Promise<MusicVideo[]> {
    if (!this.apiKey) return [];

    const cacheKey = `${artistName}-${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const searchQuery = `${artistName} official music video`;
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        videoCategoryId: '10',
        maxResults: String(limit),
        order: 'relevance',
        key: this.apiKey,
      });

      const searchResponse = await fetch(`${YOUTUBE_API_URL}/search?${searchParams}`);
      if (!searchResponse.ok) throw new Error(`HTTP ${searchResponse.status}`);

      const searchData = (await searchResponse.json()) as YouTubeSearchResponse;
      const videoIds = searchData.items.map((item) => item.id.videoId).join(',');

      if (!videoIds) return [];

      const detailsParams = new URLSearchParams({
        part: 'contentDetails,statistics',
        id: videoIds,
        key: this.apiKey,
      });

      const detailsResponse = await fetch(`${YOUTUBE_API_URL}/videos?${detailsParams}`);
      const detailsData = (await detailsResponse.json()) as YouTubeVideoDetails;

      const detailsMap = new Map(
        detailsData.items.map((item) => [
          item.id,
          {
            duration: this.parseDuration(item.contentDetails.duration),
            viewCount: parseInt(item.statistics.viewCount, 10) || 0,
          },
        ])
      );

      const videos: MusicVideo[] = searchData.items.map((item) => {
        const details = detailsMap.get(item.id.videoId);
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
          publishedAt: item.snippet.publishedAt,
          viewCount: details?.viewCount,
          duration: details?.duration,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
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

  private parseDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default YouTubeVideosProvider;
