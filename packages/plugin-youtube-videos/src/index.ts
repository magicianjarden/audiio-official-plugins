/**
 * YouTube Videos Provider
 * Provides music videos using youtubei.js (same as YouTube Music plugin).
 */

import {
  BaseArtistEnrichmentProvider,
  type MusicVideo,
  type VideoStreamInfo
} from '@audiio/sdk';
import * as vm from 'vm';

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

      // Create Innertube instance
      this.yt = await Innertube.create({
        cache: new UniversalCache(true),
        generate_session_locally: true,
        fetch: globalThis.fetch,
      });

      // Patch the Player's decipher method directly to use vm
      if (this.yt?.session?.player) {
        const player = this.yt.session.player as any;
        const originalDecipher = player.decipher?.bind(player);

        if (originalDecipher) {
          console.log('[YouTube Videos] Wrapping Player.decipher with vm evaluator');
          player.decipher = (url: string, signatureCipher: string) => {
            // Parse the signature cipher
            const params = new URLSearchParams(signatureCipher);
            const sig = params.get('s');
            const sp = params.get('sp') || 'sig';
            const baseUrl = params.get('url') || url;

            if (!sig || !player.sig_decipher_sc) {
              console.log('[YouTube Videos] No signature to decipher, using base URL');
              return baseUrl;
            }

            try {
              // Run the decipher script in vm context
              const decipherScript = player.sig_decipher_sc;
              const context = { sig };
              const decipheredSig = vm.runInNewContext(`${decipherScript}; sig`, context);

              const finalUrl = new URL(baseUrl);
              finalUrl.searchParams.set(sp, decipheredSig);

              // Handle n parameter if present
              if (player.nsig_decipher_sc) {
                const n = finalUrl.searchParams.get('n');
                if (n) {
                  try {
                    const nContext = { n };
                    const decipheredN = vm.runInNewContext(`${player.nsig_decipher_sc}; n`, nContext);
                    finalUrl.searchParams.set('n', decipheredN);
                  } catch (nErr) {
                    console.log('[YouTube Videos] N-sig decipher failed:', nErr);
                  }
                }
              }

              return finalUrl.toString();
            } catch (err) {
              console.log('[YouTube Videos] Decipher failed:', err);
              return baseUrl;
            }
          };
        }
      }

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

  async getVideoStream(videoId: string, preferredQuality = '720p'): Promise<VideoStreamInfo | null> {
    if (!this.yt) {
      console.warn('[YouTube Videos] Not initialized');
      return null;
    }

    try {
      console.log(`[YouTube Videos] Getting stream for video: ${videoId}, quality: ${preferredQuality}`);

      // Use getInfo for full streaming data
      const info = await this.yt.getInfo(videoId);

      if (!info.streaming_data) {
        console.error('[YouTube Videos] No streaming data available');
        return null;
      }

      const streamingData = info.streaming_data as {
        formats?: unknown[];
        adaptive_formats?: unknown[];
        hls_manifest_url?: string;
        dash_manifest_url?: string;
      };

      // Try HLS manifest URL first (works for many videos)
      if (streamingData.hls_manifest_url) {
        console.log('[YouTube Videos] Using HLS manifest URL');
        return {
          url: streamingData.hls_manifest_url,
          mimeType: 'application/x-mpegURL',
          quality: preferredQuality,
          audioOnly: false,
          expiresAt: Date.now() + 3600000,
        };
      }

      // Try DASH manifest URL
      if (streamingData.dash_manifest_url) {
        console.log('[YouTube Videos] Using DASH manifest URL');
        return {
          url: streamingData.dash_manifest_url,
          mimeType: 'application/dash+xml',
          quality: preferredQuality,
          audioOnly: false,
          expiresAt: Date.now() + 3600000,
        };
      }

      // Parse preferred quality to height
      const preferredHeight = parseInt(preferredQuality.replace('p', '')) || 720;

      // Type for format with direct URL access (same as YTMusic plugin)
      type FormatWithUrl = {
        url?: string;
        mime_type?: string;
        itag?: number;
        width?: number;
        height?: number;
        quality_label?: string;
        bitrate?: number;
        signatureCipher?: string;
      };

      // Try combined formats first (video + audio in one stream)
      const combinedFormats = (info.streaming_data.formats || []) as unknown as FormatWithUrl[];
      console.log(`[YouTube Videos] Combined formats: ${combinedFormats.length}`);

      let bestCombined: { url: string; mimeType: string; quality: string; width?: number; height?: number } | null = null;

      for (const format of combinedFormats) {
        console.log(`[YouTube Videos] Format ${format.itag}: mime=${format.mime_type}, hasUrl=${!!format.url}, hasCipher=${!!format.signatureCipher}`);

        if (!format.url) continue;

        const mimeType = format.mime_type?.split(';')[0] || '';
        if (!mimeType.startsWith('video/')) continue;

        const height = format.height || 0;
        const quality = format.quality_label || `${height}p`;

        console.log(`[YouTube Videos] Found format: ${quality} (${height}p), ${mimeType}`);

        if (!bestCombined ||
            (height <= preferredHeight && height > (bestCombined.height || 0)) ||
            ((bestCombined.height || 0) > preferredHeight && height <= preferredHeight)) {
          bestCombined = { url: format.url, mimeType, quality, width: format.width, height };
        }
      }

      // If we found a combined format, use it
      if (bestCombined) {
        console.log(`[YouTube Videos] Using combined stream: ${bestCombined.quality}`);
        return {
          url: bestCombined.url,
          mimeType: bestCombined.mimeType,
          quality: bestCombined.quality,
          width: bestCombined.width,
          height: bestCombined.height,
          audioOnly: false,
          expiresAt: Date.now() + 3600000,
        };
      }

      // Try adaptive formats (separate video + audio streams)
      const adaptiveFormats = (info.streaming_data.adaptive_formats || []) as unknown as FormatWithUrl[];
      console.log(`[YouTube Videos] Adaptive formats: ${adaptiveFormats.length}`);

      let bestVideo: { url: string; mimeType: string; quality: string; width?: number; height?: number } | null = null;
      let bestAudio: { url: string; mimeType: string; bitrate: number } | null = null;

      for (const format of adaptiveFormats) {
        if (!format.url) continue;

        const mimeType = format.mime_type?.split(';')[0] || '';

        if (mimeType.startsWith('video/')) {
          const height = format.height || 0;
          const quality = format.quality_label || `${height}p`;

          console.log(`[YouTube Videos] Adaptive video: ${quality}, ${mimeType}`);

          if (!bestVideo ||
              (height <= preferredHeight && height > (bestVideo.height || 0)) ||
              ((bestVideo.height || 0) > preferredHeight && height <= preferredHeight)) {
            bestVideo = { url: format.url, mimeType, quality, width: format.width, height };
          }
        } else if (mimeType.startsWith('audio/')) {
          const bitrate = format.bitrate || 0;
          if (!bestAudio || bitrate > bestAudio.bitrate) {
            bestAudio = { url: format.url, mimeType, bitrate };
          }
        }
      }

      if (bestVideo) {
        console.log(`[YouTube Videos] Using adaptive stream: ${bestVideo.quality}, hasAudio: ${!!bestAudio}`);
        return {
          url: bestVideo.url,
          mimeType: bestVideo.mimeType,
          quality: bestVideo.quality,
          width: bestVideo.width,
          height: bestVideo.height,
          audioOnly: false,
          audioUrl: bestAudio?.url,
          audioMimeType: bestAudio?.mimeType,
          expiresAt: Date.now() + 3600000,
        };
      }

      // Last resort: try chooseFormat which handles deciphering internally
      console.log('[YouTube Videos] Trying chooseFormat method...');
      try {
        const infoAny = info as unknown as {
          chooseFormat?: (options: { quality: string; type: string }) => {
            url?: string;
            decipher?: (player: unknown) => string;
            mime_type?: string;
            quality_label?: string;
            width?: number;
            height?: number;
          };
        };

        if (infoAny.chooseFormat) {
          const format = infoAny.chooseFormat({ quality: 'best', type: 'video+audio' });
          if (format) {
            let url = format.url;

            // Try to decipher if no direct URL
            if (!url && format.decipher && this.yt?.session?.player) {
              console.log('[YouTube Videos] Deciphering URL...');
              try {
                url = format.decipher(this.yt.session.player);
              } catch (decipherError) {
                console.log('[YouTube Videos] Decipher failed:', decipherError);
              }
            }

            if (url && typeof url === 'string') {
              console.log(`[YouTube Videos] Got URL from chooseFormat: ${format.quality_label}`);
              // Return a plain object (no proxies or non-serializable values)
              const result: VideoStreamInfo = {
                url: String(url),
                mimeType: String(format.mime_type?.split(';')[0] || 'video/mp4'),
                quality: String(format.quality_label || preferredQuality),
                width: format.width ? Number(format.width) : undefined,
                height: format.height ? Number(format.height) : undefined,
                audioOnly: false,
                expiresAt: Date.now() + 3600000,
              };
              return result;
            }
          }
        }
      } catch (formatError) {
        console.log('[YouTube Videos] chooseFormat failed:', formatError);
      }

      console.error('[YouTube Videos] No suitable format found');
      return null;
    } catch (error) {
      console.error('[YouTube Videos] Failed to get video stream:', error);
      return null;
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
