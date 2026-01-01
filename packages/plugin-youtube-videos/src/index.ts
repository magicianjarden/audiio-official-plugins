/**
 * YouTube Videos Provider
 * Provides music videos using youtubei.js (same as YouTube Music plugin).
 */

import {
  BaseArtistEnrichmentProvider,
  type MusicVideo
} from '@audiio/sdk';

// Type for the Innertube instance
type InnertubeType = Awaited<ReturnType<typeof import('youtubei.js')['Innertube']['create']>>;

export class YouTubeVideosProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'youtube-videos';
  readonly name = 'YouTube Music Videos';
  readonly enrichmentType = 'videos' as const;

  private yt: InnertubeType | null = null;
  private cache = new Map<string, { data: MusicVideo[]; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes

  async initialize(): Promise<void> {
    console.log('[YouTube Videos] Initializing with youtubei.js...');
    try {
      // Dynamic import for ESM module
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const ytModule = await dynamicImport('youtubei.js');
      const { Innertube, UniversalCache } = ytModule;

      this.yt = await Innertube.create({
        cache: new UniversalCache(true),
        generate_session_locally: true
      });
      console.log('[YouTube Videos] Initialized successfully');
    } catch (error) {
      console.error('[YouTube Videos] Failed to initialize:', error);
    }
  }

  async getArtistVideos(artistName: string, limit = 10): Promise<MusicVideo[]> {
    if (!this.yt) {
      console.warn('[YouTube Videos] Not initialized');
      return [];
    }

    const cacheKey = `${artistName}-${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const searchQuery = `${artistName} official music video`;
      console.log(`[YouTube Videos] Searching for: "${searchQuery}"`);

      const results = await this.yt.search(searchQuery, { type: 'video' });

      if (!results.results || results.results.length === 0) {
        console.log('[YouTube Videos] No results found');
        return [];
      }

      const videos: MusicVideo[] = [];

      for (const item of results.results) {
        if (videos.length >= limit) break;

        const video = this.mapSearchResult(item);
        if (video) {
          videos.push(video);
        }
      }

      console.log(`[YouTube Videos] Found ${videos.length} videos for "${artistName}"`);
      this.cache.set(cacheKey, { data: videos, timestamp: Date.now() });
      return videos;
    } catch (error) {
      console.error('[YouTube Videos] Search failed:', error);
      return [];
    }
  }

  async getAlbumVideos(
    albumTitle: string,
    artistName: string,
    trackNames?: string[],
    limit = 8
  ): Promise<MusicVideo[]> {
    if (!this.yt) {
      console.warn('[YouTube Videos] Not initialized');
      return [];
    }

    const cacheKey = `album-${albumTitle}-${artistName}-${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const seenIds = new Set<string>();
      const allVideos: MusicVideo[] = [];

      // Strategy 1: Search for album title + artist
      const albumQuery = `${albumTitle} ${artistName} official`;
      console.log(`[YouTube Videos] Searching album: "${albumQuery}"`);

      const albumResults = await this.yt.search(albumQuery, { type: 'video' });
      if (albumResults.results) {
        for (const item of albumResults.results) {
          if (allVideos.length >= Math.ceil(limit / 2)) break;
          const video = this.mapSearchResult(item);
          if (video && !seenIds.has(video.id)) {
            seenIds.add(video.id);
            allVideos.push(video);
          }
        }
      }

      // Strategy 2: Search for individual track titles (top 3)
      if (trackNames && trackNames.length > 0 && allVideos.length < limit) {
        const tracksToSearch = trackNames.slice(0, 3);
        for (const trackName of tracksToSearch) {
          if (allVideos.length >= limit) break;

          const trackQuery = `${trackName} ${artistName} official video`;
          console.log(`[YouTube Videos] Searching track: "${trackQuery}"`);

          try {
            const trackResults = await this.yt.search(trackQuery, { type: 'video' });
            if (trackResults.results) {
              for (const item of trackResults.results) {
                if (allVideos.length >= limit) break;
                const video = this.mapSearchResult(item);
                if (video && !seenIds.has(video.id)) {
                  seenIds.add(video.id);
                  allVideos.push(video);
                }
              }
            }
          } catch (trackError) {
            console.warn(`[YouTube Videos] Track search failed for "${trackName}":`, trackError);
          }
        }
      }

      console.log(`[YouTube Videos] Found ${allVideos.length} videos for album "${albumTitle}"`);
      this.cache.set(cacheKey, { data: allVideos, timestamp: Date.now() });
      return allVideos;
    } catch (error) {
      console.error('[YouTube Videos] Album search failed:', error);
      return [];
    }
  }

  private mapSearchResult(item: unknown): MusicVideo | null {
    const video = item as {
      type?: string;
      id?: string;
      title?: { text?: string } | string;
      short_view_count?: { text?: string };
      view_count?: { text?: string };
      published?: { text?: string };
      duration?: { seconds?: number; text?: string };
      thumbnails?: Array<{ url?: string; width?: number; height?: number }>;
      best_thumbnail?: { url?: string };
    };

    // Only process video types
    if (video.type !== 'Video') {
      return null;
    }

    const id = video.id;
    if (!id) return null;

    // Extract title
    let title = '';
    if (typeof video.title === 'string') {
      title = video.title;
    } else if (video.title?.text) {
      title = video.title.text;
    }
    if (!title) return null;

    // Extract view count
    let viewCount = 0;
    const viewText = video.short_view_count?.text || video.view_count?.text || '';
    if (viewText) {
      viewCount = this.parseViewCount(viewText);
    }

    // Extract duration
    let duration = '';
    if (video.duration?.seconds) {
      duration = this.formatDuration(video.duration.seconds);
    } else if (video.duration?.text) {
      duration = video.duration.text;
    }

    // Extract thumbnail
    let thumbnail = '';
    if (video.best_thumbnail?.url) {
      thumbnail = video.best_thumbnail.url;
    } else if (video.thumbnails && video.thumbnails.length > 0) {
      // Get highest quality thumbnail
      const sorted = [...video.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
      thumbnail = sorted[0]?.url || '';
    }
    if (!thumbnail) {
      thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    }

    return {
      id,
      title,
      thumbnail,
      publishedAt: video.published?.text || '',
      viewCount,
      duration,
      url: `https://www.youtube.com/watch?v=${id}`,
      source: 'youtube',
    };
  }

  private parseViewCount(text: string): number {
    // Parse "1.2M views", "500K views", etc.
    const match = text.match(/([\d.]+)\s*([KMB])?/i);
    if (!match) return 0;

    let num = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    if (suffix === 'K') num *= 1000;
    else if (suffix === 'M') num *= 1000000;
    else if (suffix === 'B') num *= 1000000000;

    return Math.round(num);
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
