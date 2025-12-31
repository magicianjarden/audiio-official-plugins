/**
 * MusicBrainz Metadata Provider
 * Provides track, artist, and album metadata from the free MusicBrainz database
 *
 * API Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 * Rate Limit: 1 request per second (we use a queue to respect this)
 * Cover Art: Uses Cover Art Archive (https://coverartarchive.org)
 */

import {
  BaseMetadataProvider,
  type MetadataSearchResult,
  type MetadataSearchOptions,
  type MetadataTrack,
  type Artist,
  type Album,
  type ArtworkSet,
  type ArtistDetail
} from '@audiio/sdk';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const COVER_ART_API = 'https://coverartarchive.org';
const USER_AGENT = 'Audiio/1.0.0 (https://github.com/magicianjarden/audiio)';

// Rate limiting: MusicBrainz requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });
}

// MusicBrainz API response types
interface MBArtistCredit {
  name: string;
  artist: {
    id: string;
    name: string;
    'sort-name': string;
  };
}

interface MBRelease {
  id: string;
  title: string;
  date?: string;
  'release-group'?: {
    id: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  };
  'artist-credit'?: MBArtistCredit[];
  'track-count'?: number;
}

interface MBRecording {
  id: string;
  title: string;
  length?: number; // in milliseconds
  'artist-credit': MBArtistCredit[];
  releases?: MBRelease[];
  isrcs?: string[];
}

interface MBArtist {
  id: string;
  name: string;
  'sort-name': string;
  type?: string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  tags?: { name: string; count: number }[];
}

interface MBReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: MBArtistCredit[];
}

interface MBSearchResponse<T> {
  created: string;
  count: number;
  offset: number;
  recordings?: T[];
  artists?: T[];
  releases?: T[];
  'release-groups'?: T[];
}

interface MBBrowseResponse<T> {
  'recording-count'?: number;
  'recording-offset'?: number;
  recordings?: T[];
  'release-group-count'?: number;
  'release-group-offset'?: number;
  'release-groups'?: T[];
}

interface MBArtistRelations {
  id: string;
  name: string;
  relations?: {
    type: string;
    direction: string;
    artist?: MBArtist;
  }[];
}

/** Provider settings */
interface MusicBrainzProviderSettings {
  fetchArtwork: boolean;
  fetchArtistInfo: boolean;
  fetchAlbumInfo: boolean;
  fetchExternalIds: boolean;
}

const DEFAULT_SETTINGS: MusicBrainzProviderSettings = {
  fetchArtwork: true,
  fetchArtistInfo: true,
  fetchAlbumInfo: true,
  fetchExternalIds: true
};

export class MusicBrainzMetadataProvider extends BaseMetadataProvider {
  readonly id = 'musicbrainz';
  readonly name = 'MusicBrainz';
  readonly priority = 60; // Lower than Deezer (80) - acts as fallback

  private settings: MusicBrainzProviderSettings = { ...DEFAULT_SETTINGS };
  private coverArtCache: Map<string, ArtworkSet | null> = new Map();

  /**
   * Update provider settings
   */
  updateSettings(settings: Partial<MusicBrainzProviderSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): Record<string, unknown> {
    return { ...this.settings } as Record<string, unknown>;
  }

  async search(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult> {
    const limit = Math.min(options?.limit ?? 25, 100); // MB max is 100
    const offset = options?.offset ?? 0;

    try {
      // Search for recordings (tracks)
      const url = `${MUSICBRAINZ_API}/recording?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&fmt=json`;
      const response = await rateLimitedFetch(url);

      if (!response.ok) {
        throw new Error(`MusicBrainz API error: ${response.status}`);
      }

      const data = await response.json() as MBSearchResponse<MBRecording>;
      const recordings = data.recordings || [];

      // Map recordings to tracks
      const tracks = await Promise.all(
        recordings.slice(0, limit).map(recording => this.mapRecording(recording))
      );

      return {
        tracks,
        artists: [],
        albums: []
      };
    } catch (error) {
      console.error('[MusicBrainz] Search error:', error);
      return { tracks: [], artists: [], albums: [] };
    }
  }

  async getTrack(id: string): Promise<MetadataTrack | null> {
    try {
      const url = `${MUSICBRAINZ_API}/recording/${id}?inc=artist-credits+releases+isrcs&fmt=json`;
      const response = await rateLimitedFetch(url);

      if (!response.ok) return null;

      const data = await response.json() as MBRecording;
      return this.mapRecording(data);
    } catch (error) {
      console.error('[MusicBrainz] getTrack error:', error);
      return null;
    }
  }

  async getArtist(id: string): Promise<ArtistDetail | null> {
    if (!this.settings.fetchArtistInfo) {
      return null;
    }

    try {
      // Fetch artist info with relations (for similar artists)
      const artistUrl = `${MUSICBRAINZ_API}/artist/${id}?inc=tags+artist-rels&fmt=json`;
      const artistResponse = await rateLimitedFetch(artistUrl);

      if (!artistResponse.ok) return null;

      const artistData = await artistResponse.json() as MBArtistRelations & MBArtist;

      // Fetch release groups (albums) - separate request due to rate limiting
      const releaseGroupsUrl = `${MUSICBRAINZ_API}/release-group?artist=${id}&limit=100&fmt=json`;
      const releaseGroupsResponse = await rateLimitedFetch(releaseGroupsUrl);
      const releaseGroupsData = releaseGroupsResponse.ok
        ? await releaseGroupsResponse.json() as MBBrowseResponse<MBReleaseGroup>
        : { 'release-groups': [] };

      // Categorize release groups
      const albums: Album[] = [];
      const singles: Album[] = [];
      const eps: Album[] = [];
      const compilations: Album[] = [];

      for (const rg of releaseGroupsData['release-groups'] || []) {
        const album = await this.mapReleaseGroup(rg);
        const primaryType = rg['primary-type']?.toLowerCase();
        const secondaryTypes = rg['secondary-types']?.map(t => t.toLowerCase()) || [];

        if (secondaryTypes.includes('compilation')) {
          compilations.push(album);
        } else if (primaryType === 'single') {
          singles.push(album);
        } else if (primaryType === 'ep') {
          eps.push(album);
        } else if (primaryType === 'album') {
          albums.push(album);
        } else {
          albums.push(album); // Default to albums
        }
      }

      // Extract similar artists from relations
      const similarArtists: Artist[] = [];
      if (artistData.relations) {
        for (const rel of artistData.relations) {
          if (rel.artist && (rel.type === 'member of band' || rel.type === 'collaboration')) {
            similarArtists.push({
              id: rel.artist.id,
              name: rel.artist.name
            });
          }
        }
      }

      const result: ArtistDetail = {
        id: artistData.id,
        name: artistData.name,
        topTracks: [], // MusicBrainz doesn't have popularity data
        albums,
        singles,
        eps,
        compilations,
        appearsOn: [],
        similarArtists: similarArtists.slice(0, 10)
      };

      return result;
    } catch (error) {
      console.error('[MusicBrainz] getArtist error:', error);
      return null;
    }
  }

  async getAlbum(id: string): Promise<(Album & { tracks: MetadataTrack[] }) | null> {
    if (!this.settings.fetchAlbumInfo) {
      return null;
    }

    try {
      // Get release group info
      const rgUrl = `${MUSICBRAINZ_API}/release-group/${id}?inc=artist-credits+releases&fmt=json`;
      const rgResponse = await rateLimitedFetch(rgUrl);

      if (!rgResponse.ok) return null;

      const rgData = await rgResponse.json() as MBReleaseGroup & { releases?: MBRelease[] };

      // Get the first release to fetch tracks
      const firstRelease = rgData.releases?.[0];
      let tracks: MetadataTrack[] = [];

      if (firstRelease) {
        const releaseUrl = `${MUSICBRAINZ_API}/release/${firstRelease.id}?inc=recordings+artist-credits&fmt=json`;
        const releaseResponse = await rateLimitedFetch(releaseUrl);

        if (releaseResponse.ok) {
          const releaseData = await releaseResponse.json() as {
            media?: { tracks?: { recording: MBRecording; position: number }[] }[];
          };

          // Extract recordings from all media (discs)
          for (const medium of releaseData.media || []) {
            for (const track of medium.tracks || []) {
              const mappedTrack = await this.mapRecording(track.recording);
              tracks.push(mappedTrack);
            }
          }
        }
      }

      const album = await this.mapReleaseGroup(rgData);

      return {
        ...album,
        tracks
      };
    } catch (error) {
      console.error('[MusicBrainz] getAlbum error:', error);
      return null;
    }
  }

  /**
   * Get popular/recent releases (MusicBrainz doesn't have charts, so we get recent releases)
   */
  async getCharts(limit = 20): Promise<{
    tracks: MetadataTrack[];
    artists: Artist[];
    albums: Album[];
  }> {
    try {
      // MusicBrainz doesn't have charts, but we can search for popular terms
      // to get relevant results
      const popularQueries = [
        'top hits',
        'popular music',
        'new releases',
        'best songs'
      ];

      const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
      const result = await this.search(randomQuery, { limit });

      return {
        tracks: result.tracks,
        artists: [],
        albums: []
      };
    } catch (error) {
      console.error('[MusicBrainz] getCharts error:', error);
      return { tracks: [], artists: [], albums: [] };
    }
  }

  /**
   * Map MusicBrainz recording to MetadataTrack
   */
  private async mapRecording(recording: MBRecording): Promise<MetadataTrack> {
    const artists = recording['artist-credit']?.map(ac => ({
      id: ac.artist.id,
      name: ac.artist.name
    })) || [];

    const firstRelease = recording.releases?.[0];
    let album: Album | undefined;
    let artwork: ArtworkSet | undefined;

    if (firstRelease && this.settings.fetchAlbumInfo) {
      album = {
        id: firstRelease.id,
        title: firstRelease.title,
        releaseDate: firstRelease.date
      };

      // Try to get cover art
      if (this.settings.fetchArtwork) {
        artwork = await this.getCoverArt(firstRelease.id);
      }
    }

    const result: MetadataTrack = {
      id: recording.id,
      title: recording.title,
      artists: artists.length > 0 ? artists : [{ id: 'unknown', name: 'Unknown Artist' }],
      duration: recording.length ? Math.floor(recording.length / 1000) : 0,
      _provider: 'musicbrainz'
    };

    if (album) {
      result.album = album;
    }

    if (artwork) {
      result.artwork = artwork;
    }

    if (this.settings.fetchExternalIds) {
      result.externalIds = {
        musicbrainz: recording.id,
        isrc: recording.isrcs?.[0]
      };
    }

    return result;
  }

  /**
   * Map MusicBrainz release group to Album
   */
  private async mapReleaseGroup(rg: MBReleaseGroup): Promise<Album> {
    const artists = rg['artist-credit']?.map(ac => ({
      id: ac.artist.id,
      name: ac.artist.name
    }));

    const album: Album = {
      id: rg.id,
      title: rg.title,
      releaseDate: rg['first-release-date'],
      artists
    };

    if (this.settings.fetchArtwork) {
      const artwork = await this.getCoverArt(rg.id);
      if (artwork) {
        album.artwork = artwork;
      }
    }

    return album;
  }

  /**
   * Get cover art from Cover Art Archive
   */
  private async getCoverArt(releaseId: string): Promise<ArtworkSet | undefined> {
    // Check cache first
    if (this.coverArtCache.has(releaseId)) {
      const cached = this.coverArtCache.get(releaseId);
      return cached || undefined;
    }

    try {
      // Cover Art Archive doesn't require rate limiting
      const response = await fetch(`${COVER_ART_API}/release/${releaseId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        this.coverArtCache.set(releaseId, null);
        return undefined;
      }

      const data = await response.json() as {
        images?: {
          front?: boolean;
          thumbnails?: {
            small?: string;
            large?: string;
            '250'?: string;
            '500'?: string;
            '1200'?: string;
          };
          image?: string;
        }[];
      };

      // Find front cover image
      const frontImage = data.images?.find(img => img.front);
      if (!frontImage) {
        this.coverArtCache.set(releaseId, null);
        return undefined;
      }

      const artwork: ArtworkSet = {
        small: frontImage.thumbnails?.['250'] || frontImage.thumbnails?.small,
        medium: frontImage.thumbnails?.['500'] || frontImage.thumbnails?.large,
        large: frontImage.thumbnails?.['1200'] || frontImage.image,
        original: frontImage.image
      };

      this.coverArtCache.set(releaseId, artwork);
      return artwork;
    } catch {
      this.coverArtCache.set(releaseId, null);
      return undefined;
    }
  }
}

// Default export for addon loading
export default MusicBrainzMetadataProvider;
