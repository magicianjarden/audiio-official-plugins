/**
 * Bandsintown Provider
 * Provides upcoming concert information from Bandsintown API.
 */

import {
  BaseArtistEnrichmentProvider,
  type Concert
} from '@audiio/sdk';

const BANDSINTOWN_API_URL = 'https://rest.bandsintown.com';

interface BandsintownEvent {
  id: string;
  url: string;
  on_sale_datetime: string | null;
  datetime: string;
  venue: {
    name: string;
    city: string;
    region: string;
    country: string;
  };
  lineup: string[];
  offers: Array<{ type: string; url: string; status: string }>;
}

export class BandsintownProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'bandsintown';
  readonly name = 'Bandsintown Concerts';
  readonly enrichmentType = 'concerts' as const;

  private appId: string = 'audiio';
  private cache = new Map<string, { data: Concert[]; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes

  async initialize(): Promise<void> {
    console.log('[Bandsintown] Initializing...');
  }

  async getUpcomingConcerts(artistName: string): Promise<Concert[]> {
    const cacheKey = artistName.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const encodedArtist = encodeURIComponent(artistName);
      const url = `${BANDSINTOWN_API_URL}/artists/${encodedArtist}/events?app_id=${this.appId}`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      const events = data as BandsintownEvent[];

      const concerts: Concert[] = events.map((event) => ({
        id: event.id,
        datetime: event.datetime,
        venue: {
          name: event.venue.name,
          city: event.venue.city,
          region: event.venue.region || undefined,
          country: event.venue.country,
        },
        lineup: event.lineup,
        ticketUrl: event.offers[0]?.url || event.url,
        onSaleDate: event.on_sale_datetime || undefined,
        offers: event.offers,
        source: 'bandsintown',
      }));

      this.cache.set(cacheKey, { data: concerts, timestamp: Date.now() });
      return concerts;
    } catch (error) {
      console.error('[Bandsintown] Failed:', error);
      return [];
    }
  }
}

export default BandsintownProvider;
