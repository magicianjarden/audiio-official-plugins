/**
 * Fanart.tv Provider
 * Provides high-quality artist images from Fanart.tv API.
 */

import {
  BaseArtistEnrichmentProvider,
  type ArtistImages
} from '@audiio/sdk';

const FANART_API_URL = 'https://webservice.fanart.tv/v3/music';

interface FanartImage {
  id: string;
  url: string;
  likes: string;
}

interface FanartArtistResponse {
  name: string;
  mbid_id: string;
  artistbackground?: FanartImage[];
  artistthumb?: FanartImage[];
  hdmusiclogo?: FanartImage[];
  musiclogo?: FanartImage[];
  musicbanner?: FanartImage[];
}

interface FanartSettings {
  apiKey: string;
}

export class FanartProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'fanart';
  readonly name = 'Fanart.tv';
  readonly enrichmentType = 'gallery' as const;

  private apiKey: string = '';
  private cache = new Map<string, { data: ArtistImages; timestamp: number }>();
  private cacheTTL = 3600000; // 1 hour

  async initialize(): Promise<void> {
    console.log('[Fanart.tv] Initializing...');
  }

  updateSettings(settings: Partial<FanartSettings>): void {
    if (settings.apiKey) {
      this.apiKey = settings.apiKey;
    }
  }

  async getArtistGallery(mbid: string): Promise<ArtistImages> {
    if (!this.apiKey) {
      return this.emptyResult();
    }

    const cached = this.cache.get(mbid);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`${FANART_API_URL}/${mbid}?api_key=${this.apiKey}`);

      if (!response.ok) {
        if (response.status === 404) return this.emptyResult();
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as FanartArtistResponse;
      const result = this.transformResponse(data);
      this.cache.set(mbid, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('[Fanart.tv] Failed to fetch:', error);
      return this.emptyResult();
    }
  }

  private transformResponse(data: FanartArtistResponse): ArtistImages {
    return {
      backgrounds: (data.artistbackground || []).map((img) => ({
        url: img.url,
        likes: parseInt(img.likes, 10) || 0,
      })),
      thumbs: (data.artistthumb || []).map((img) => ({
        url: img.url,
        likes: parseInt(img.likes, 10) || 0,
      })),
      logos: (data.musiclogo || []).map((img) => ({
        url: img.url,
        likes: parseInt(img.likes, 10) || 0,
      })),
      hdLogos: (data.hdmusiclogo || []).map((img) => ({
        url: img.url,
        likes: parseInt(img.likes, 10) || 0,
      })),
      banners: (data.musicbanner || []).map((img) => ({
        url: img.url,
        likes: parseInt(img.likes, 10) || 0,
      })),
    };
  }

  private emptyResult(): ArtistImages {
    return { backgrounds: [], thumbs: [], logos: [], hdLogos: [], banners: [] };
  }
}

export default FanartProvider;
