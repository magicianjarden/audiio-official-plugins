/**
 * Discogs Provider
 * Provides artist timeline/discography from Discogs API.
 */

import {
  BaseArtistEnrichmentProvider,
  type TimelineEntry
} from '@audiio/sdk';

const DISCOGS_API_URL = 'https://api.discogs.com';

interface DiscogsRelease {
  id: number;
  type: string;
  title: string;
  year: number;
  thumb: string;
  role: string;
  format?: string;
  label?: string;
}

interface DiscogsSettings {
  apiKey: string;
  apiSecret?: string;
}

export class DiscogsProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'discogs';
  readonly name = 'Discogs Timeline';
  readonly enrichmentType = 'timeline' as const;

  private apiKey: string = '';
  private apiSecret: string = '';
  private cache = new Map<string, { data: TimelineEntry[]; timestamp: number }>();
  private cacheTTL = 3600000; // 1 hour

  async initialize(): Promise<void> {
    console.log('[Discogs] Initializing...');
  }

  updateSettings(settings: Partial<DiscogsSettings>): void {
    if (settings.apiKey) this.apiKey = settings.apiKey;
    if (settings.apiSecret) this.apiSecret = settings.apiSecret;
  }

  async searchArtist(artistName: string): Promise<{ id: string; name: string } | null> {
    try {
      const params = new URLSearchParams({ q: artistName, type: 'artist', per_page: '5' });
      if (this.apiKey) {
        params.append('key', this.apiKey);
        if (this.apiSecret) params.append('secret', this.apiSecret);
      }

      const response = await fetch(`${DISCOGS_API_URL}/database/search?${params}`, {
        headers: { 'User-Agent': 'Audiio/1.0' },
      });

      if (!response.ok) return null;
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return { id: String(data.results[0].id), name: data.results[0].title };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getArtistTimeline(artistName: string): Promise<TimelineEntry[]> {
    const cacheKey = artistName.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const artist = await this.searchArtist(artistName);
      if (!artist) return [];

      const params = new URLSearchParams({ sort: 'year', sort_order: 'asc', per_page: '100' });
      if (this.apiKey) {
        params.append('key', this.apiKey);
        if (this.apiSecret) params.append('secret', this.apiSecret);
      }

      const response = await fetch(`${DISCOGS_API_URL}/artists/${artist.id}/releases?${params}`, {
        headers: { 'User-Agent': 'Audiio/1.0' },
      });

      if (!response.ok) return [];
      const data = await response.json();

      const mainRoles = ['Main', 'TrackAppearance'];
      const releases = data.releases
        .filter((r: DiscogsRelease) => r.year && r.year > 0)
        .filter((r: DiscogsRelease) => mainRoles.includes(r.role) || !r.role);

      const seenTitles = new Set<string>();
      const timeline: TimelineEntry[] = [];

      for (const release of releases) {
        const key = `${release.year}-${release.title.toLowerCase().trim()}`;
        if (seenTitles.has(key)) continue;
        seenTitles.add(key);

        timeline.push({
          year: release.year,
          type: this.determineReleaseType(release.format),
          title: release.title,
          artwork: release.thumb || undefined,
          label: release.label || undefined,
          id: String(release.id),
          source: 'discogs',
        });
      }

      timeline.sort((a, b) => a.year - b.year);
      this.cache.set(cacheKey, { data: timeline, timestamp: Date.now() });
      return timeline;
    } catch (error) {
      console.error('[Discogs] Failed:', error);
      return [];
    }
  }

  private determineReleaseType(format?: string): 'album' | 'single' | 'ep' | 'compilation' | 'live' {
    if (!format) return 'album';
    const f = format.toLowerCase();
    if (f.includes('single') || f.includes('7"')) return 'single';
    if (f.includes('ep') || f.includes('mini')) return 'ep';
    if (f.includes('comp')) return 'compilation';
    if (f.includes('live')) return 'live';
    return 'album';
  }
}

export default DiscogsProvider;
