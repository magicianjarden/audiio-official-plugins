/**
 * YouTube Music Stream Provider
 * Provides audio streams from YouTube Music using youtubei.js
 */

import {
  BaseStreamProvider,
  type StreamTrack,
  type StreamSearchOptions,
  type StreamInfo,
  type Quality,
  type AddonManifest,
  type MusicVideo,
  type SearchResultType,
  type SearchProviderOptions
} from '@audiio/sdk';

// Type for the Innertube instance - we use dynamic import since youtubei.js is ESM-only
type InnertubeType = Awaited<ReturnType<typeof import('youtubei.js')['Innertube']['create']>>;

// Set to true to enable verbose debug logging
const DEBUG = false;

function log(...args: unknown[]) {
  console.log('[YTMusic]', ...args);
}

function debug(...args: unknown[]) {
  if (DEBUG) console.log('[YTMusic:debug]', ...args);
}

export class YouTubeMusicProvider extends BaseStreamProvider {
  readonly id = 'youtube-music';
  readonly name = 'YouTube Music';
  readonly requiresAuth = false;
  readonly supportedQualities: Quality[] = ['high', 'medium', 'low'];
  readonly supportedSearchTypes: SearchResultType[] = ['videos'];

  get manifest(): AddonManifest {
    return {
    id: 'youtube-music',
    name: 'YouTube Music',
    version: '1.0.0',
    description: 'Audio streaming and video search from YouTube Music',
    author: 'Audiio',
    roles: ['stream-provider', 'search-provider'],
    privacy: {
      collects: false,
      sharesWithThirdParties: false,
      tracksAcrossApps: false,

      dataAccess: [
        {
          category: 'library-data',
          usage: ['service-functionality'],
          required: true,
          userFriendlyLabel: 'Search Queries',
          userFriendlyDesc: 'Track and artist names used to find streams',
          technicalDesc: 'Search queries for track matching (artist + title)'
        },
        {
          category: 'audio-content',
          usage: ['service-functionality'],
          required: true,
          userFriendlyLabel: 'Audio Streaming',
          userFriendlyDesc: 'Streams audio content from YouTube Music',
          technicalDesc: 'Audio stream URLs fetched via youtubei.js library'
        }
      ],

      networkAccess: [
        {
          host: 'music.youtube.com',
          purpose: 'Search and stream audio content',
          dataTypes: ['library-data', 'audio-content']
        },
        {
          host: 'www.youtube.com',
          purpose: 'Fetch stream URLs and metadata',
          dataTypes: ['audio-content']
        }
      ],

      localStorageUsed: true,
      localStorageDesc: 'Caches session data for API requests',
      dataRetention: 'session',
      lastUpdated: '2025-01-06'
    }
    };
  }

  private yt: InnertubeType | null = null;

  async initialize(): Promise<void> {
    // Use Function constructor to ensure dynamic import isn't converted to require
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const ytModule = await dynamicImport('youtubei.js');
    const { Innertube, UniversalCache, ClientType } = ytModule;

    // Try to create with Android client first (often provides direct URLs)
    try {
      this.yt = await Innertube.create({
        client_type: ClientType.ANDROID,
        cache: new UniversalCache(true)
      });
      log('Initialized with Android client');
    } catch {
      this.yt = await Innertube.create({
        cache: new UniversalCache(true),
        generate_session_locally: true
      });
      log('Initialized with web client');
    }
  }

  async dispose(): Promise<void> {
    this.yt = null;
  }

  isAuthenticated(): boolean {
    return false; // Using public API
  }

  async search(query: string, options?: StreamSearchOptions): Promise<StreamTrack[]> {
    if (!this.yt) throw new Error('YouTube Music not initialized');

    const limit = options?.limit ?? 20;
    debug('Search query:', query);

    const results = await this.yt.music.search(query, { type: 'song' });

    if (!results.contents) {
      debug('No contents in results');
      return [];
    }

    const tracks: StreamTrack[] = [];

    // YouTube Music returns nested structure: contents -> MusicShelf -> contents -> items
    for (const shelf of results.contents) {
      if (tracks.length >= limit) break;

      // Check if this is a MusicShelf with contents
      const shelfObj = shelf as { type?: string; contents?: unknown[] };
      if (shelfObj.type === 'MusicShelf' && shelfObj.contents) {
        debug('Found MusicShelf with', shelfObj.contents.length, 'items');

        for (const item of shelfObj.contents) {
          if (tracks.length >= limit) break;

          const track = this.mapSearchResult(item);
          if (track) {
            tracks.push(track);
          }
        }
      } else if ('id' in shelf) {
        // Direct item (fallback)
        const track = this.mapSearchResult(shelf);
        if (track) {
          tracks.push(track);
        }
      }
    }

    debug('Mapped', tracks.length, 'tracks');
    return tracks;
  }

  async searchByMetadata(metadata: {
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    isrc?: string;
  }): Promise<StreamTrack | null> {
    if (!this.yt) throw new Error('YouTube Music not initialized');

    // Build search query
    const query = `${metadata.artist} ${metadata.title}`.trim();
    debug('searchByMetadata query:', query);

    const results = await this.search(query, { limit: 10 });

    if (results.length === 0) return null;

    // Score and find best match
    let bestMatch: StreamTrack | null = null;
    let bestScore = 0;

    for (const candidate of results) {
      const score = this.calculateMatchScore(
        {
          title: candidate.title,
          artists: candidate.artists,
          duration: candidate.duration
        },
        {
          title: metadata.title,
          artist: metadata.artist,
          duration: metadata.duration
        }
      );

      debug('Candidate:', candidate.title, 'by', candidate.artists.join(', '), '- score:', score.toFixed(2));

      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      log('Matched:', bestMatch.title, 'by', bestMatch.artists.join(', '), `(${bestScore.toFixed(2)})`);
    }
    return bestMatch;
  }

  /**
   * Search for music videos on YouTube
   * Implements SearchProvider interface
   */
  async searchVideos(query: string, options?: SearchProviderOptions): Promise<MusicVideo[]> {
    if (!this.yt) throw new Error('YouTube Music not initialized');

    const limit = options?.limit ?? 8;
    debug('Video search query:', query);

    try {
      // Search YouTube for videos (not just songs)
      const results = await this.yt.search(query + ' official music video', { type: 'video' });

      if (!results.results) {
        debug('No video results');
        return [];
      }

      const videos: MusicVideo[] = [];

      for (const item of results.results) {
        if (videos.length >= limit) break;

        const video = this.mapVideoResult(item);
        if (video) {
          videos.push(video);
        }
      }

      debug('Found', videos.length, 'videos');
      return videos;
    } catch (error) {
      console.error('[YTMusic] Video search error:', error);
      return [];
    }
  }

  /**
   * Map YouTube search result to MusicVideo
   */
  private mapVideoResult(item: unknown): MusicVideo | null {
    const videoItem = item as {
      type?: string;
      id?: string;
      title?: { text?: string } | string;
      thumbnails?: Array<{ url?: string; width?: number }>;
      duration?: { seconds?: number; text?: string };
      short_view_count?: { text?: string };
      view_count?: { text?: string };
      published?: { text?: string };
      author?: { name?: string };
    };

    // Only process video items
    if (videoItem.type !== 'Video' && videoItem.type !== 'CompactVideo') {
      return null;
    }

    const id = videoItem.id;
    if (!id) return null;

    // Extract title
    let title = '';
    if (typeof videoItem.title === 'string') {
      title = videoItem.title;
    } else if (videoItem.title?.text) {
      title = videoItem.title.text;
    }
    if (!title) return null;

    // Get best thumbnail
    const thumbnail = videoItem.thumbnails?.[0]?.url || '';

    // Parse duration
    let duration: string | undefined;
    if (videoItem.duration?.text) {
      duration = videoItem.duration.text;
    } else if (videoItem.duration?.seconds) {
      const secs = videoItem.duration.seconds;
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      duration = `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    }

    // Parse view count
    let viewCount: number | undefined;
    const viewText = videoItem.short_view_count?.text || videoItem.view_count?.text;
    if (viewText) {
      viewCount = this.parseViewCount(viewText);
    }

    return {
      id,
      title,
      thumbnail,
      duration,
      viewCount,
      publishedAt: videoItem.published?.text || '',
      url: `https://www.youtube.com/watch?v=${id}`,
      source: 'youtube-music'
    };
  }

  /**
   * Parse view count text like "1.2M views" to number
   */
  private parseViewCount(text: string): number | undefined {
    const match = text.match(/([\d.]+)\s*([KMB])?/i);
    if (!match) return undefined;

    let num = parseFloat(match[1]!);
    const suffix = match[2]?.toUpperCase();

    if (suffix === 'K') num *= 1000;
    else if (suffix === 'M') num *= 1000000;
    else if (suffix === 'B') num *= 1000000000;

    return Math.round(num);
  }

  async getStream(trackId: string, quality?: Quality): Promise<StreamInfo> {
    if (!this.yt) throw new Error('YouTube Music not initialized');

    debug('Getting stream for:', trackId);

    // Choose format based on quality preference
    const selectedQuality = this.selectQuality(this.supportedQualities, quality);
    const preferHighBitrate = selectedQuality !== 'low';

    // Try multiple approaches - getBasicInfo first as it's most reliable
    const result = await this.tryGetBasicInfo(trackId, preferHighBitrate)
      || await this.tryMusicGetInfo(trackId, preferHighBitrate)
      || await this.tryGetInfo(trackId, selectedQuality);

    if (!result) {
      throw new Error('Could not extract stream URL');
    }

    debug('Got stream URL');
    return {
      url: result.url,
      format: this.mapMimeType(result.mimeType),
      bitrate: result.bitrate,
      expiresAt: Date.now() + (6 * 60 * 60 * 1000) // ~6 hours
    };
  }

  private async tryGetBasicInfo(trackId: string, preferHighBitrate: boolean): Promise<{ url: string; mimeType: string; bitrate: number } | null> {
    try {
      const basicInfo = await this.yt!.getBasicInfo(trackId);
      const streamingData = basicInfo.streaming_data;

      if (!streamingData) return null;

      // Try adaptive formats with direct URLs (most common success path)
      if (streamingData.adaptive_formats) {
        // Sort by bitrate
        const audioFormats = streamingData.adaptive_formats
          .filter(f => {
            const fmt = f as unknown as { mime_type?: string; url?: string };
            return fmt.mime_type?.includes('audio') && fmt.url;
          })
          .sort((a, b) => {
            const aRate = (a as unknown as { bitrate?: number }).bitrate ?? 0;
            const bRate = (b as unknown as { bitrate?: number }).bitrate ?? 0;
            return preferHighBitrate ? bRate - aRate : aRate - bRate;
          });

        for (const format of audioFormats) {
          const f = format as unknown as { url?: string; mime_type?: string; bitrate?: number };
          if (f.url) {
            return {
              url: f.url,
              mimeType: f.mime_type ?? 'audio/mp4',
              bitrate: f.bitrate ?? 128000
            };
          }
        }
      }

      // Fallback to HLS/DASH manifests
      if (streamingData.hls_manifest_url) {
        return { url: streamingData.hls_manifest_url, mimeType: 'application/x-mpegURL', bitrate: 128000 };
      }
      if (streamingData.dash_manifest_url) {
        return { url: streamingData.dash_manifest_url, mimeType: 'application/dash+xml', bitrate: 128000 };
      }
    } catch {
      debug('getBasicInfo failed');
    }
    return null;
  }

  private async tryMusicGetInfo(trackId: string, preferHighBitrate: boolean): Promise<{ url: string; mimeType: string; bitrate: number } | null> {
    try {
      const musicInfo = await this.yt!.music.getInfo(trackId);
      const streamingData = (musicInfo as unknown as { streaming_data?: { adaptive_formats?: unknown[] } }).streaming_data;

      if (!streamingData?.adaptive_formats) return null;

      const audioFormats = (streamingData.adaptive_formats as Array<{
        url?: string;
        signatureCipher?: string;
        mime_type?: string;
        bitrate?: number;
        decipher?: (player: unknown) => Promise<string>;
      }>)
        .filter(f => f.mime_type?.includes('audio'))
        .sort((a, b) => {
          const aRate = a.bitrate ?? 0;
          const bRate = b.bitrate ?? 0;
          return preferHighBitrate ? bRate - aRate : aRate - bRate;
        });

      for (const format of audioFormats) {
        // Try direct URL
        if (format.url && !format.signatureCipher) {
          return { url: format.url, mimeType: format.mime_type ?? 'audio/mp4', bitrate: format.bitrate ?? 128000 };
        }
        // Try decipher
        if (format.decipher && this.yt!.session?.player) {
          try {
            const url = await format.decipher(this.yt!.session.player);
            return { url, mimeType: format.mime_type ?? 'audio/mp4', bitrate: format.bitrate ?? 128000 };
          } catch {
            continue;
          }
        }
      }
    } catch {
      debug('music.getInfo failed');
    }
    return null;
  }

  private async tryGetInfo(trackId: string, selectedQuality: Quality): Promise<{ url: string; mimeType: string; bitrate: number } | null> {
    try {
      const videoInfo = await this.yt!.getInfo(trackId);
      const format = videoInfo.chooseFormat({
        type: 'audio',
        quality: selectedQuality === 'high' ? 'best' : selectedQuality === 'low' ? 'worst' : undefined
      });

      if (!format) return null;

      const formatAny = format as unknown as { url?: string; signatureCipher?: string };

      // Try direct URL
      if (formatAny.url && !formatAny.signatureCipher) {
        return { url: formatAny.url, mimeType: format.mime_type, bitrate: format.bitrate ?? 128000 };
      }

      // Try decipher
      try {
        const url = await format.decipher(this.yt!.session.player);
        return { url, mimeType: format.mime_type, bitrate: format.bitrate ?? 128000 };
      } catch {
        return null;
      }
    } catch {
      debug('getInfo failed');
    }
    return null;
  }

  private mapSearchResult(item: unknown): StreamTrack | null {
    // Handle MusicResponsiveListItem structure from youtubei.js
    const musicItem = item as {
      type?: string;
      id?: string;
      video_id?: string;
      title?: { text?: string } | string;
      name?: string;
      artists?: Array<{ name?: string }>;
      author?: { name?: string };
      authors?: Array<{ name?: string }>;
      duration?: { seconds?: number; text?: string };
      thumbnail?: Array<{ url?: string }> | { contents?: Array<{ url?: string }> };
      thumbnails?: Array<{ url?: string }>;
      playlistItemData?: { videoId?: string };
      flex_columns?: unknown[];
    };

    // Extract ID - try multiple locations
    const id = musicItem.id || musicItem.video_id || musicItem.playlistItemData?.videoId;
    if (!id) return null;

    // Extract title
    let title = '';
    if (typeof musicItem.title === 'string') {
      title = musicItem.title;
    } else if (musicItem.title?.text) {
      title = musicItem.title.text;
    } else if (musicItem.name) {
      title = musicItem.name;
    }

    if (!title) return null;

    // Extract artists - try multiple locations
    const artists: string[] = [];
    if (musicItem.artists && Array.isArray(musicItem.artists)) {
      for (const artist of musicItem.artists) {
        if (artist.name) artists.push(artist.name);
      }
    } else if (musicItem.authors && Array.isArray(musicItem.authors)) {
      for (const author of musicItem.authors) {
        if (author.name) artists.push(author.name);
      }
    } else if (musicItem.author?.name) {
      artists.push(musicItem.author.name);
    }

    // Extract duration
    let duration = 0;
    if (musicItem.duration?.seconds) {
      duration = musicItem.duration.seconds;
    } else if (musicItem.duration?.text) {
      duration = this.parseDurationText(musicItem.duration.text);
    }

    // Extract thumbnail - handle multiple structures
    let thumbnail: string | undefined;
    if (Array.isArray(musicItem.thumbnail) && musicItem.thumbnail.length > 0) {
      thumbnail = musicItem.thumbnail[0]?.url;
    } else if (musicItem.thumbnails && musicItem.thumbnails.length > 0) {
      thumbnail = musicItem.thumbnails[0]?.url;
    }

    debug('Mapped:', title, 'by', artists.join(', '));

    return {
      id,
      title,
      artists: artists.length > 0 ? artists : ['Unknown Artist'],
      duration,
      availableQualities: this.supportedQualities,
      thumbnail
    };
  }

  private parseDurationText(text: string): number {
    // Parse "3:45" or "1:23:45" format
    const parts = text.split(':').map(p => parseInt(p, 10));

    if (parts.length === 2) {
      return (parts[0]! * 60) + parts[1]!;
    } else if (parts.length === 3) {
      return (parts[0]! * 3600) + (parts[1]! * 60) + parts[2]!;
    }

    return 0;
  }

  private mapMimeType(mimeType: string): StreamInfo['format'] {
    if (mimeType.includes('opus')) return 'opus';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('aac')) return 'aac';
    return 'mp4';
  }
}

// Default export for addon loading
export default YouTubeMusicProvider;
