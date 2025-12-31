/**
 * AudiioDB Charts Data Provider
 *
 * Provides chart/trending tracks to the Discover "See All" pipeline.
 * Sources data from AudiioDB's 256M track database sorted by popularity.
 */

import type {
  DataProvider,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack, MetadataTrack } from '@audiio/core';
import { AudiioDBMetadataProvider, audiioDBClient } from '../audiiodb-provider';

const PLUGIN_ID = 'audiiodb';

/**
 * Convert MetadataTrack to UnifiedTrack format
 */
function toUnifiedTrack(track: MetadataTrack): UnifiedTrack {
  return {
    id: `audiiodb:${track.id}`,
    title: track.title,
    artists: track.artists || [],
    album: track.album,
    duration: track.duration || 0,
    artwork: track.artwork,
    explicit: track.explicit,
    streamSources: [],
    _meta: {
      metadataProvider: 'audiiodb',
      matchConfidence: 1,
      externalIds: track.externalIds || { audiiodb: track.id },
      lastUpdated: new Date(),
    },
  };
}

/**
 * AudiioDB Charts Data Provider
 *
 * Provides trending and popular tracks from the AudiioDB database.
 */
export const audiioDBChartsProvider: DataProvider = {
  id: `${PLUGIN_ID}:charts`,
  pluginId: PLUGIN_ID,
  priority: 65, // Between MusicBrainz (60) and Deezer (80)
  name: 'AudiioDB Charts',
  description: 'Provides trending tracks from AudiioDB open-source database',

  canProvide(query: StructuredSectionQuery): boolean {
    return (
      query.sectionType === 'trending' ||
      query.sectionType === 'charts' ||
      query.sectionType === 'new-releases' ||
      query.sectionType === 'top-hits' ||
      query.sectionType === 'genre' ||
      (query.strategy === 'plugin' &&
        query.pluginHooks?.dataProviders?.includes(`${PLUGIN_ID}:charts`))
    );
  },

  async provide(context: PipelineContext): Promise<UnifiedTrack[]> {
    const limit = context.query.limit || 20;

    try {
      // Genre-specific query
      if (
        context.query.sectionType === 'genre' &&
        context.query.embedding?.genre
      ) {
        return await fetchGenreTracks(context.query.embedding.genre, limit);
      }

      // New releases
      if (context.query.sectionType === 'new-releases') {
        return await fetchNewReleases(limit);
      }

      // Use provider if available
      const provider = getAudiioDBProvider();
      if (provider) {
        const charts = await provider.getCharts(limit);
        return charts.tracks.map(toUnifiedTrack);
      }

      // Fallback: direct API call
      return await fetchChartTracks(limit);
    } catch (error) {
      console.error('[AudiioDBCharts] Failed to fetch:', error);
      return [];
    }
  },
};

/**
 * Fetch chart tracks directly from API
 */
async function fetchChartTracks(limit: number): Promise<UnifiedTrack[]> {
  try {
    const charts = await audiioDBClient.getCharts(limit);

    return charts.tracks.map((track) => ({
      id: `audiiodb:${track.id}`,
      title: track.title,
      artists: track.artists.map((a) => ({
        id: String(a.id),
        name: a.name,
      })),
      album: track.album_id && track.album_title
        ? {
            id: String(track.album_id),
            title: track.album_title,
          }
        : undefined,
      duration: Math.floor(track.duration_ms / 1000),
      explicit: track.explicit,
      artwork: track.album_id
        ? {
            medium: audiioDBClient.getArtworkUrl('album', track.album_id, 'medium'),
            large: audiioDBClient.getArtworkUrl('album', track.album_id, 'large'),
          }
        : undefined,
      streamSources: [],
      _meta: {
        metadataProvider: 'audiiodb',
        matchConfidence: 1,
        externalIds: {
          audiiodb: String(track.id),
          spotify: track.spotify_id,
          isrc: track.isrc,
        },
        lastUpdated: new Date(),
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch genre-specific tracks
 */
async function fetchGenreTracks(
  genre: string,
  limit: number
): Promise<UnifiedTrack[]> {
  try {
    // Search with genre filter
    const result = await audiioDBClient.search(genre, {
      limit,
      filters: { genre },
    });

    return result.tracks.map((track) => ({
      id: `audiiodb:${track.id}`,
      title: track.title,
      artists: track.artists.map((a) => ({
        id: String(a.id),
        name: a.name,
      })),
      album: track.album_id && track.album_title
        ? {
            id: String(track.album_id),
            title: track.album_title,
          }
        : undefined,
      duration: Math.floor(track.duration_ms / 1000),
      explicit: track.explicit,
      artwork: track.album_id
        ? {
            medium: audiioDBClient.getArtworkUrl('album', track.album_id, 'medium'),
          }
        : undefined,
      streamSources: [],
      _meta: {
        metadataProvider: 'audiiodb',
        matchConfidence: 1,
        externalIds: {
          audiiodb: String(track.id),
          spotify: track.spotify_id,
          isrc: track.isrc,
        },
        lastUpdated: new Date(),
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch new album releases and return their tracks
 */
async function fetchNewReleases(limit: number): Promise<UnifiedTrack[]> {
  try {
    const releases = await audiioDBClient.getNewReleases(limit);
    const tracks: UnifiedTrack[] = [];

    // Get first track from each new album
    for (const album of releases.albums.slice(0, limit)) {
      const albumTracks = await audiioDBClient.getAlbumTracks(album.id);
      if (albumTracks.length > 0) {
        const firstTrack = albumTracks[0];
        tracks.push({
          id: `audiiodb:${firstTrack.id}`,
          title: firstTrack.title,
          artists: firstTrack.artists.map((a) => ({
            id: String(a.id),
            name: a.name,
          })),
          album: {
            id: String(album.id),
            title: album.title,
            releaseDate: album.release_date,
            artwork: {
              medium: audiioDBClient.getArtworkUrl('album', album.id, 'medium'),
              large: audiioDBClient.getArtworkUrl('album', album.id, 'large'),
            },
          },
          duration: Math.floor(firstTrack.duration_ms / 1000),
          explicit: firstTrack.explicit,
          artwork: {
            medium: audiioDBClient.getArtworkUrl('album', album.id, 'medium'),
            large: audiioDBClient.getArtworkUrl('album', album.id, 'large'),
          },
          streamSources: [],
          _meta: {
            metadataProvider: 'audiiodb',
            matchConfidence: 1,
            externalIds: {
              audiiodb: String(firstTrack.id),
              spotify: firstTrack.spotify_id,
            },
            lastUpdated: new Date(),
          },
        });
      }
    }

    return tracks;
  } catch {
    return [];
  }
}

// Singleton provider instance
let audiioDBProviderInstance: AudiioDBMetadataProvider | null = null;

function getAudiioDBProvider(): AudiioDBMetadataProvider | null {
  return audiioDBProviderInstance;
}

export function setAudiioDBProvider(provider: AudiioDBMetadataProvider): void {
  audiioDBProviderInstance = provider;
}
