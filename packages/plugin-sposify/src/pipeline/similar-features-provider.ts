/**
 * Similar Audio Features Provider
 *
 * Provides tracks with similar audio features to seed tracks.
 * Uses Spotify's audio features database to find acoustically similar music.
 */

import type {
  DataProvider,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { AudioFeatures } from '../types';
import { AudioFeaturesDatabase } from '../database/audio-features-db';
import { getSposifyDatabase } from '../database/sposify-db';

const PLUGIN_ID = 'sposify';

export const similarFeaturesProvider: DataProvider = {
  id: `${PLUGIN_ID}:similar-features`,
  pluginId: PLUGIN_ID,
  priority: 55, // Lower than primary sources
  name: 'Similar Audio Features',
  description: 'Finds tracks with similar audio characteristics',

  canProvide(query: StructuredSectionQuery): boolean {
    // Provide for similar/seed-based queries or when plugin hook is specified
    return (
      query.embedding?.method === 'similar' ||
      query.embedding?.method === 'seed' ||
      (query.strategy === 'plugin' &&
        query.pluginHooks?.dataProviders?.includes(`${PLUGIN_ID}:similar-features`))
    );
  },

  async provide(context: PipelineContext): Promise<UnifiedTrack[]> {
    const limit = context.query.limit || 20;
    const db = getAudioFeaturesDb();
    const sposifyDb = getSposifyDatabase();

    if (!db || !sposifyDb) return [];

    try {
      // Get seed track IDs
      const seedTrackIds = context.query.embedding?.seedTrackIds || [];
      if (seedTrackIds.length === 0) return [];

      // Get audio features for seed tracks
      const seedFeatures: AudioFeatures[] = [];
      for (const trackId of seedTrackIds) {
        // Extract Spotify ID from track ID
        const spotifyId = extractSpotifyId(trackId);
        if (spotifyId) {
          const features = db.getBySpotifyId(spotifyId);
          if (features) {
            seedFeatures.push(features);
          }
        }
      }

      if (seedFeatures.length === 0) return [];

      // Calculate average features from seeds
      const avgFeatures = calculateAverageFeatures(seedFeatures);

      // Find similar tracks
      const similarResults = db.findSimilar(avgFeatures, limit * 2);

      // Convert to UnifiedTrack format
      const tracks: UnifiedTrack[] = [];
      const excludeIds = new Set(context.query.embedding?.excludeTrackIds || []);

      for (const result of similarResults) {
        if (tracks.length >= limit) break;

        // Skip excluded tracks
        const fullId = `spotify:${result.spotifyId}`;
        if (excludeIds.has(fullId) || excludeIds.has(result.spotifyId)) {
          continue;
        }

        // Get track info from database
        const trackInfo = sposifyDb.getTrackBySpotifyId(result.spotifyId);
        if (!trackInfo) continue;

        tracks.push({
          id: `spotify:${result.spotifyId}`,
          title: trackInfo.track_name,
          artists: [
            {
              id: `spotify:${trackInfo.artist_id || ''}`,
              name: trackInfo.artist_name,
            },
          ],
          album: trackInfo.album_name
            ? {
                id: `spotify:${trackInfo.album_id || ''}`,
                title: trackInfo.album_name,
              }
            : undefined,
          duration: trackInfo.duration_ms ? trackInfo.duration_ms / 1000 : 0,
          streamSources: [],
          _meta: {
            metadataProvider: 'sposify',
            matchConfidence: result.similarity,
            externalIds: {
              spotify: result.spotifyId,
              isrc: trackInfo.isrc,
            },
            lastUpdated: new Date(),
          },
        });
      }

      return tracks;
    } catch (error) {
      console.error('[SposifyPipeline] Failed to find similar tracks:', error);
      return [];
    }
  },
};

/**
 * Extract Spotify ID from various track ID formats
 */
function extractSpotifyId(trackId: string): string | null {
  // Handle "spotify:trackId" format
  if (trackId.startsWith('spotify:')) {
    return trackId.slice(8);
  }

  // Handle Spotify URI format "spotify:track:ID"
  if (trackId.startsWith('spotify:track:')) {
    return trackId.slice(14);
  }

  // Handle raw Spotify ID (22 char alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(trackId)) {
    return trackId;
  }

  return null;
}

/**
 * Calculate average features from multiple tracks
 */
function calculateAverageFeatures(features: AudioFeatures[]): AudioFeatures {
  if (features.length === 0) {
    throw new Error('Cannot calculate average of empty features array');
  }

  if (features.length === 1) {
    return features[0];
  }

  const sums = {
    tempo: 0,
    key: 0,
    mode: 0,
    timeSignature: 0,
    danceability: 0,
    energy: 0,
    loudness: 0,
    speechiness: 0,
    acousticness: 0,
    instrumentalness: 0,
    liveness: 0,
    valence: 0,
  };

  for (const f of features) {
    sums.tempo += f.tempo;
    sums.key += f.key;
    sums.mode += f.mode;
    sums.timeSignature += f.timeSignature;
    sums.danceability += f.danceability;
    sums.energy += f.energy;
    sums.loudness += f.loudness;
    sums.speechiness += f.speechiness;
    sums.acousticness += f.acousticness;
    sums.instrumentalness += f.instrumentalness;
    sums.liveness += f.liveness;
    sums.valence += f.valence;
  }

  const count = features.length;
  return {
    spotifyId: 'average',
    tempo: sums.tempo / count,
    key: Math.round(sums.key / count),
    mode: Math.round(sums.mode / count),
    timeSignature: Math.round(sums.timeSignature / count),
    danceability: sums.danceability / count,
    energy: sums.energy / count,
    loudness: sums.loudness / count,
    speechiness: sums.speechiness / count,
    acousticness: sums.acousticness / count,
    instrumentalness: sums.instrumentalness / count,
    liveness: sums.liveness / count,
    valence: sums.valence / count,
  };
}

// Singleton database instance
let dbInstance: AudioFeaturesDatabase | null = null;

function getAudioFeaturesDb(): AudioFeaturesDatabase | null {
  return dbInstance;
}

export function setAudioFeaturesDb(db: AudioFeaturesDatabase): void {
  dbInstance = db;
}
