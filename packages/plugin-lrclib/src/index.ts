/**
 * LRCLib Lyrics Provider
 * Provides synchronized lyrics from LRCLib API
 */

import {
  BaseLyricsProvider,
  type LyricsQuery,
  type LyricsSearchOptions,
  type LyricsResult,
  type AddonManifest
} from '@audiio/sdk';

const LRCLIB_API = 'https://lrclib.net/api';

export class LRCLibProvider extends BaseLyricsProvider {
  readonly id = 'lrclib';
  readonly name = 'LRCLib';
  readonly supportsSynced = true;

  get manifest(): AddonManifest {
    return {
    id: 'lrclib',
    name: 'LRCLib',
    version: '1.0.0',
    description: 'Synchronized lyrics from the LRCLib community database',
    author: 'Audiio',
    roles: ['lyrics-provider'],
    privacy: {
      collects: false,
      sharesWithThirdParties: false,
      tracksAcrossApps: false,

      dataAccess: [
        {
          category: 'library-data',
          usage: ['service-functionality'],
          required: true,
          userFriendlyLabel: 'Track Information',
          userFriendlyDesc: 'Song title, artist, album, and duration for lyrics lookup',
          technicalDesc: 'track_name, artist_name, album_name, duration parameters'
        }
      ],

      networkAccess: [
        {
          host: 'lrclib.net',
          purpose: 'Fetch synchronized lyrics',
          dataTypes: ['library-data']
        }
      ],

      localStorageUsed: false,
      dataRetention: 'session',
      lastUpdated: '2025-01-06'
    }
    };
  }

  async getLyrics(
    query: LyricsQuery,
    _options?: LyricsSearchOptions
  ): Promise<LyricsResult | null> {
    try {
      const params = new URLSearchParams({
        track_name: query.title,
        artist_name: query.artist
      });

      if (query.album) {
        params.set('album_name', query.album);
      }

      if (query.duration) {
        params.set('duration', String(query.duration));
      }

      const response = await fetch(`${LRCLIB_API}/get?${params}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as {
        syncedLyrics?: string;
        plainLyrics?: string;
      };

      if (!data.syncedLyrics && !data.plainLyrics) {
        return null;
      }

      return {
        synced: data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : undefined,
        plain: data.plainLyrics,
        // Include raw LRC for client-side parsing
        _rawSynced: data.syncedLyrics,
        source: 'lrclib'
      };
    } catch {
      return null;
    }
  }
}

export default LRCLibProvider;
