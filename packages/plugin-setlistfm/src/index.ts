/**
 * Setlist.fm Provider
 * Provides past concert setlists from Setlist.fm API.
 */

import {
  BaseArtistEnrichmentProvider,
  type Setlist
} from '@audiio/sdk';

const SETLISTFM_API_URL = 'https://api.setlist.fm/rest/1.0';

interface SetlistFmSetlist {
  id: string;
  eventDate: string;
  venue: {
    name: string;
    city: { name: string; country: { name: string } };
  };
  tour?: { name: string };
  sets: { set: Array<{ song: Array<{ name: string; info?: string; cover?: object }> }> };
  url: string;
}

interface SetlistFmSettings {
  apiKey: string;
}

export class SetlistFmProvider extends BaseArtistEnrichmentProvider {
  readonly id = 'setlistfm';
  readonly name = 'Setlist.fm';
  readonly enrichmentType = 'setlists' as const;

  private apiKey: string = '';
  private cache = new Map<string, { data: Setlist[]; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes

  async initialize(): Promise<void> {
    console.log('[Setlist.fm] Initializing...');
  }

  updateSettings(settings: Partial<SetlistFmSettings>): void {
    if (settings.apiKey) {
      this.apiKey = settings.apiKey;
    }
  }

  async searchArtist(artistName: string): Promise<{ id: string; name: string } | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `${SETLISTFM_API_URL}/search/artists?artistName=${encodeURIComponent(artistName)}&p=1&sort=relevance`,
        { headers: { Accept: 'application/json', 'x-api-key': this.apiKey } }
      );

      if (!response.ok) return null;
      const data = await response.json();

      if (data.artist && data.artist.length > 0) {
        return { id: data.artist[0].mbid, name: data.artist[0].name };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getArtistSetlists(artistName: string, mbid?: string, limit = 5): Promise<Setlist[]> {
    if (!this.apiKey) return [];

    const cacheKey = mbid || artistName.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      let artistMbid = mbid;
      if (!artistMbid) {
        const artist = await this.searchArtist(artistName);
        if (!artist) return [];
        artistMbid = artist.id;
      }

      const response = await fetch(
        `${SETLISTFM_API_URL}/artist/${artistMbid}/setlists?p=1`,
        { headers: { Accept: 'application/json', 'x-api-key': this.apiKey } }
      );

      if (!response.ok) return [];
      const data = await response.json();

      if (!data.setlist) return [];

      const setlistsWithSongs = data.setlist
        .filter((s: SetlistFmSetlist) => s.sets?.set?.some((set) => set.song?.length > 0))
        .slice(0, limit);

      const setlists: Setlist[] = setlistsWithSongs.map((s: SetlistFmSetlist) => ({
        id: s.id,
        eventDate: this.formatDate(s.eventDate),
        venue: {
          name: s.venue.name,
          city: s.venue.city.name,
          country: s.venue.city.country.name,
        },
        tour: s.tour?.name,
        songs: s.sets?.set?.flatMap((set) =>
          (set.song || []).map((song) => ({
            name: song.name,
            info: song.info,
            cover: song.cover ? true : undefined,
          }))
        ) || [],
        url: s.url,
        source: 'setlistfm',
      }));

      this.cache.set(cacheKey, { data: setlists, timestamp: Date.now() });
      return setlists;
    } catch (error) {
      console.error('[Setlist.fm] Failed:', error);
      return [];
    }
  }

  private formatDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
}

export default SetlistFmProvider;
