/**
 * Audio Features Transformer
 *
 * Filters and reorders tracks based on audio features like BPM, energy, and key.
 * Uses the EssentiaProvider for audio analysis.
 */

import type {
  ResultTransformer,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { AudioFeatures } from '@audiio/ml-sdk';
import { EssentiaProvider } from '../providers/essentia/essentia-provider';

const PLUGIN_ID = 'algo';

// Energy level to approximate BPM and loudness ranges
const ENERGY_PROFILES: Record<
  string,
  { bpmMin: number; bpmMax: number; loudnessMin: number; loudnessMax: number }
> = {
  low: { bpmMin: 50, bpmMax: 90, loudnessMin: -30, loudnessMax: -15 },
  medium: { bpmMin: 80, bpmMax: 130, loudnessMin: -20, loudnessMax: -8 },
  high: { bpmMin: 110, bpmMax: 180, loudnessMin: -12, loudnessMax: -3 },
};

// Mood to energy mapping
const MOOD_ENERGY_MAP: Record<string, string> = {
  happy: 'medium',
  sad: 'low',
  energetic: 'high',
  chill: 'low',
  romantic: 'low',
  angry: 'high',
  uplifting: 'medium',
  party: 'high',
  focus: 'medium',
  relaxed: 'low',
};

// Key compatibility (circle of fifths)
const KEY_COMPATIBILITY: Record<string, string[]> = {
  C: ['C', 'G', 'F', 'Am', 'Em', 'Dm'],
  G: ['G', 'D', 'C', 'Em', 'Bm', 'Am'],
  D: ['D', 'A', 'G', 'Bm', 'F#m', 'Em'],
  A: ['A', 'E', 'D', 'F#m', 'C#m', 'Bm'],
  E: ['E', 'B', 'A', 'C#m', 'G#m', 'F#m'],
  B: ['B', 'F#', 'E', 'G#m', 'D#m', 'C#m'],
  'F#': ['F#', 'C#', 'B', 'D#m', 'A#m', 'G#m'],
  F: ['F', 'C', 'Bb', 'Dm', 'Am', 'Gm'],
  Bb: ['Bb', 'F', 'Eb', 'Gm', 'Dm', 'Cm'],
  Eb: ['Eb', 'Bb', 'Ab', 'Cm', 'Gm', 'Fm'],
  Ab: ['Ab', 'Eb', 'Db', 'Fm', 'Cm', 'Bbm'],
  Db: ['Db', 'Ab', 'Gb', 'Bbm', 'Fm', 'Ebm'],
  // Minor keys
  Am: ['Am', 'Em', 'Dm', 'C', 'G', 'F'],
  Em: ['Em', 'Bm', 'Am', 'G', 'D', 'C'],
  Bm: ['Bm', 'F#m', 'Em', 'D', 'A', 'G'],
  'F#m': ['F#m', 'C#m', 'Bm', 'A', 'E', 'D'],
  'C#m': ['C#m', 'G#m', 'F#m', 'E', 'B', 'A'],
  'G#m': ['G#m', 'D#m', 'C#m', 'B', 'F#', 'E'],
  Dm: ['Dm', 'Am', 'Gm', 'F', 'C', 'Bb'],
  Gm: ['Gm', 'Dm', 'Cm', 'Bb', 'F', 'Eb'],
  Cm: ['Cm', 'Gm', 'Fm', 'Eb', 'Bb', 'Ab'],
  Fm: ['Fm', 'Cm', 'Bbm', 'Ab', 'Eb', 'Db'],
  Bbm: ['Bbm', 'Fm', 'Ebm', 'Db', 'Ab', 'Gb'],
};

export const audioFeaturesTransformer: ResultTransformer = {
  id: `${PLUGIN_ID}:audio-features`,
  pluginId: PLUGIN_ID,
  priority: 70,
  name: 'Audio Features Match',
  description: 'Matches tracks by BPM, energy, and key compatibility',
  enabledByDefault: true,

  canTransform(query: StructuredSectionQuery): boolean {
    // Apply for most embedding queries
    return !!(
      query.embedding?.energy ||
      query.embedding?.mood ||
      query.embedding?.method === 'mood' ||
      query.embedding?.method === 'genre' ||
      query.sectionType === 'workout' ||
      query.sectionType === 'focus'
    );
  },

  async transform(
    results: UnifiedTrack[],
    context: PipelineContext
  ): Promise<UnifiedTrack[]> {
    // Determine target energy level
    const queryMood = context.query.embedding?.mood?.toLowerCase();
    const queryEnergy =
      context.query.embedding?.energy || MOOD_ENERGY_MAP[queryMood || ''] || 'medium';

    const energyProfile = ENERGY_PROFILES[queryEnergy] || ENERGY_PROFILES.medium;

    // Get essentia provider
    const essentiaProvider = getEssentiaProvider();
    if (!essentiaProvider) return results;

    // Score each track by audio features
    const scored: Array<{ track: UnifiedTrack; score: number; features?: AudioFeatures }> =
      [];

    for (const track of results) {
      const features = await essentiaProvider.getAudioFeatures(track.id);
      if (!features) {
        // No audio features - neutral score
        scored.push({ track, score: 0.5 });
        continue;
      }

      // Calculate audio features match score
      const score = calculateAudioScore(features, energyProfile, context);
      scored.push({ track, score, features });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return sorted tracks
    return scored.map((s) => s.track);
  },
};

/**
 * Calculate audio features match score
 */
function calculateAudioScore(
  features: AudioFeatures,
  energyProfile: { bpmMin: number; bpmMax: number; loudnessMin: number; loudnessMax: number },
  context: PipelineContext
): number {
  let score = 0.5;

  // BPM match (0-0.35)
  const bpm = features.bpm || 120;
  if (bpm >= energyProfile.bpmMin && bpm <= energyProfile.bpmMax) {
    // Within range - calculate how centered it is
    const rangeCenter = (energyProfile.bpmMin + energyProfile.bpmMax) / 2;
    const rangeSize = (energyProfile.bpmMax - energyProfile.bpmMin) / 2;
    const distanceFromCenter = Math.abs(bpm - rangeCenter);
    score += 0.25 * (1 - distanceFromCenter / rangeSize);
  } else {
    // Outside range - penalty based on distance
    const distanceFromRange = Math.min(
      Math.abs(bpm - energyProfile.bpmMin),
      Math.abs(bpm - energyProfile.bpmMax)
    );
    score -= Math.min(0.2, distanceFromRange / 50);
  }

  // Energy/loudness match (0-0.25)
  const loudness = features.loudness || -15;
  if (loudness >= energyProfile.loudnessMin && loudness <= energyProfile.loudnessMax) {
    const rangeCenter = (energyProfile.loudnessMin + energyProfile.loudnessMax) / 2;
    const rangeSize = (energyProfile.loudnessMax - energyProfile.loudnessMin) / 2;
    const distanceFromCenter = Math.abs(loudness - rangeCenter);
    score += 0.2 * (1 - distanceFromCenter / rangeSize);
  }

  // Key compatibility (0-0.15) - if we have a reference key
  if (features.key && context.currentResults.length > 0) {
    // Check key compatibility with recently played/queued tracks
    const lastTrackKey = getLastTrackKey(context);
    if (lastTrackKey) {
      const keyStr = `${features.key}${features.mode === 'minor' ? 'm' : ''}`;
      const compatible = KEY_COMPATIBILITY[lastTrackKey] || [];
      if (compatible.includes(keyStr)) {
        score += 0.15;
      } else if (keyStr === lastTrackKey) {
        score += 0.1; // Same key
      }
    }
  }

  // Danceability bonus for party/energetic moods (0-0.1)
  const queryMood = context.query.embedding?.mood?.toLowerCase();
  if (
    (queryMood === 'party' || queryMood === 'energetic') &&
    features.danceability
  ) {
    score += 0.1 * features.danceability;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Get key of last track in current results
 */
function getLastTrackKey(_context: PipelineContext): string | null {
  // Would need to look up audio features for last track
  // Simplified: return null for now
  return null;
}

// Singleton provider instance
let essentiaProviderInstance: EssentiaProvider | null = null;

/**
 * Get essentia provider instance
 */
function getEssentiaProvider(): EssentiaProvider | null {
  return essentiaProviderInstance;
}

/**
 * Set essentia provider instance (called during plugin initialization)
 */
export function setEssentiaProvider(provider: EssentiaProvider): void {
  essentiaProviderInstance = provider;
}
