/**
 * Spotify Audio Features Transformer
 *
 * Filters and sorts tracks based on Spotify audio features like
 * energy, danceability, valence (mood), tempo, and more.
 */

import type {
  ResultTransformer,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { AudioFeatures } from '../types';
import { AudioFeaturesDatabase } from '../database/audio-features-db';

const PLUGIN_ID = 'sposify';

// Mood to audio feature mapping
// Valence (0-1): 0 = sad, 1 = happy
// Energy (0-1): 0 = calm, 1 = energetic
const MOOD_FEATURE_PROFILES: Record<
  string,
  { valence: [number, number]; energy: [number, number] }
> = {
  happy: { valence: [0.6, 1.0], energy: [0.5, 1.0] },
  sad: { valence: [0.0, 0.4], energy: [0.0, 0.5] },
  energetic: { valence: [0.4, 1.0], energy: [0.7, 1.0] },
  calm: { valence: [0.3, 0.7], energy: [0.0, 0.4] },
  melancholic: { valence: [0.0, 0.35], energy: [0.2, 0.5] },
  upbeat: { valence: [0.5, 1.0], energy: [0.6, 1.0] },
  chill: { valence: [0.3, 0.7], energy: [0.1, 0.5] },
  dark: { valence: [0.0, 0.3], energy: [0.3, 0.7] },
  romantic: { valence: [0.4, 0.8], energy: [0.2, 0.5] },
  party: { valence: [0.5, 1.0], energy: [0.7, 1.0] },
  focus: { valence: [0.3, 0.6], energy: [0.3, 0.6] },
  workout: { valence: [0.4, 1.0], energy: [0.8, 1.0] },
  sleep: { valence: [0.2, 0.5], energy: [0.0, 0.3] },
  ambient: { valence: [0.2, 0.6], energy: [0.0, 0.3] },
};

// Energy level to feature ranges
const ENERGY_PROFILES: Record<string, { energy: [number, number] }> = {
  low: { energy: [0.0, 0.4] },
  medium: { energy: [0.4, 0.7] },
  high: { energy: [0.7, 1.0] },
};

export const spotifyFeaturesTransformer: ResultTransformer = {
  id: `${PLUGIN_ID}:spotify-features`,
  pluginId: PLUGIN_ID,
  priority: 65, // After emotion but before artist diversity
  name: 'Spotify Features Filter',
  description: 'Filters tracks by Spotify audio features (energy, valence, danceability)',
  enabledByDefault: true,

  canTransform(query: StructuredSectionQuery): boolean {
    // Apply for mood or energy based queries
    return !!(query.embedding?.mood || query.embedding?.energy);
  },

  async transform(
    results: UnifiedTrack[],
    context: PipelineContext
  ): Promise<UnifiedTrack[]> {
    if (results.length === 0) return results;

    const db = getAudioFeaturesDb();
    if (!db) return results;

    const query = context.query;
    const mood = query.embedding?.mood?.toLowerCase();
    const energy = query.embedding?.energy;

    // Get target feature profile
    const moodProfile = mood ? MOOD_FEATURE_PROFILES[mood] : null;
    const energyProfile = energy ? ENERGY_PROFILES[energy] : null;

    if (!moodProfile && !energyProfile) return results;

    // Score each track based on how well it matches the profile
    const scoredTracks: Array<{ track: UnifiedTrack; score: number }> = [];

    for (const track of results) {
      const features = await getTrackFeatures(db, track);

      if (!features) {
        // No features - give neutral score
        scoredTracks.push({ track, score: 0.5 });
        continue;
      }

      let score = 0;
      let factors = 0;

      // Score by mood profile (valence + energy)
      if (moodProfile) {
        const valenceScore = scoreInRange(
          features.valence,
          moodProfile.valence[0],
          moodProfile.valence[1]
        );
        const energyScore = scoreInRange(
          features.energy,
          moodProfile.energy[0],
          moodProfile.energy[1]
        );
        score += (valenceScore + energyScore) / 2;
        factors++;
      }

      // Score by energy level
      if (energyProfile) {
        const energyScore = scoreInRange(
          features.energy,
          energyProfile.energy[0],
          energyProfile.energy[1]
        );
        score += energyScore;
        factors++;
      }

      scoredTracks.push({
        track,
        score: factors > 0 ? score / factors : 0.5,
      });
    }

    // Sort by score (highest first)
    scoredTracks.sort((a, b) => b.score - a.score);

    // Filter out tracks with very low scores (< 0.3)
    const filtered = scoredTracks.filter((t) => t.score >= 0.3);

    // If too many filtered, return at least top half
    if (filtered.length < results.length / 2) {
      return scoredTracks.slice(0, Math.ceil(results.length / 2)).map((t) => t.track);
    }

    return filtered.map((t) => t.track);
  },
};

/**
 * Score how well a value fits within a range
 * Returns 1.0 if in range, decreases linearly outside
 */
function scoreInRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) {
    return 1.0;
  }

  // Calculate distance from range
  const distance = value < min ? min - value : value - max;

  // Score decreases linearly, hitting 0 at distance of 0.5
  return Math.max(0, 1 - distance * 2);
}

/**
 * Get audio features for a track
 */
async function getTrackFeatures(
  db: AudioFeaturesDatabase,
  track: UnifiedTrack
): Promise<AudioFeatures | null> {
  // Try Spotify ID from external IDs
  const spotifyId = track._meta?.externalIds?.spotify;
  if (spotifyId) {
    return db.getBySpotifyId(spotifyId);
  }

  // Try ISRC
  const isrc = track._meta?.externalIds?.isrc;
  if (isrc) {
    return db.getByIsrc(isrc);
  }

  // Try metadata search
  const title = track.title;
  const artist = track.artists?.[0]?.name;
  if (title && artist) {
    return db.getByMetadata(title, artist);
  }

  return null;
}

// Singleton database instance
let dbInstance: AudioFeaturesDatabase | null = null;

function getAudioFeaturesDb(): AudioFeaturesDatabase | null {
  return dbInstance;
}

export function setAudioFeaturesDb(db: AudioFeaturesDatabase): void {
  dbInstance = db;
}
