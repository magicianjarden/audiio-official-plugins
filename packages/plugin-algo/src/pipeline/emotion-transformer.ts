/**
 * Emotion Transformer
 *
 * Filters and reorders tracks based on emotion/mood detection.
 * Uses the EmotionProvider to match tracks to requested mood.
 */

import type {
  ResultTransformer,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { EmotionFeatures, MoodCategory } from '@audiio/ml-sdk';
import { EmotionProvider } from '../providers/emotion/emotion-provider';

const PLUGIN_ID = 'algo';

// Mood compatibility mapping (how well moods pair together)
const MOOD_COMPATIBILITY: Record<MoodCategory, MoodCategory[]> = {
  calm: ['calm', 'melancholic', 'serene'],
  serene: ['serene', 'calm', 'hopeful'],
  hopeful: ['hopeful', 'serene', 'joyful'],
  joyful: ['joyful', 'hopeful', 'energetic'],
  energetic: ['energetic', 'joyful', 'tense'],
  tense: ['tense', 'energetic', 'angry'],
  angry: ['angry', 'tense', 'melancholic'],
  melancholic: ['melancholic', 'calm', 'angry'],
};

// Map query moods to MoodCategory
const QUERY_MOOD_MAP: Record<string, MoodCategory[]> = {
  happy: ['joyful', 'hopeful', 'energetic'],
  sad: ['melancholic', 'calm'],
  energetic: ['energetic', 'joyful', 'tense'],
  chill: ['calm', 'serene'],
  romantic: ['hopeful', 'serene', 'calm'],
  angry: ['angry', 'tense', 'energetic'],
  uplifting: ['hopeful', 'joyful', 'energetic'],
  focus: ['calm', 'serene'],
  party: ['energetic', 'joyful'],
  relaxed: ['calm', 'serene', 'hopeful'],
};

export const emotionTransformer: ResultTransformer = {
  id: `${PLUGIN_ID}:emotion`,
  pluginId: PLUGIN_ID,
  priority: 80,
  name: 'Emotion Match',
  description: 'Matches tracks to requested mood using audio emotion detection',
  enabledByDefault: true,

  canTransform(query: StructuredSectionQuery): boolean {
    // Only apply when there's a mood-related query
    return !!(
      query.embedding?.mood ||
      query.embedding?.method === 'mood' ||
      query.sectionType === 'mood' ||
      query.sectionType === 'seasonal'
    );
  },

  async transform(
    results: UnifiedTrack[],
    context: PipelineContext
  ): Promise<UnifiedTrack[]> {
    const queryMood = context.query.embedding?.mood?.toLowerCase();
    if (!queryMood) return results;

    // Get target mood categories
    const targetMoods = QUERY_MOOD_MAP[queryMood] || ['calm'];

    // Get emotion provider instance (would be injected in real implementation)
    const emotionProvider = getEmotionProvider();
    if (!emotionProvider) return results;

    // Score each track by emotion match
    const scored: Array<{ track: UnifiedTrack; score: number }> = [];

    for (const track of results) {
      const emotion = await emotionProvider.getEmotionFeatures(track.id);
      if (!emotion) {
        // No emotion data - neutral score
        scored.push({ track, score: 0.5 });
        continue;
      }

      // Calculate mood compatibility score
      const score = calculateMoodScore(emotion, targetMoods);
      scored.push({ track, score });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return sorted tracks
    return scored.map((s) => s.track);
  },
};

/**
 * Calculate mood match score
 */
function calculateMoodScore(
  emotion: EmotionFeatures,
  targetMoods: MoodCategory[]
): number {
  const trackMood = emotion.moodCategory;

  // Direct match
  if (targetMoods.includes(trackMood)) {
    return 0.9 + emotion.moodConfidence * 0.1;
  }

  // Check compatibility
  const compatible = MOOD_COMPATIBILITY[trackMood] || [];
  for (const target of targetMoods) {
    if (compatible.includes(target)) {
      return 0.6 + emotion.moodConfidence * 0.2;
    }
  }

  // Use valence/arousal distance
  const targetVA = getMoodValenceArousal(targetMoods[0]);
  const distance = Math.sqrt(
    Math.pow(emotion.valence - targetVA.valence, 2) +
      Math.pow(emotion.arousal - targetVA.arousal, 2)
  );

  // Convert distance to score (closer = higher)
  return Math.max(0, 1 - distance);
}

/**
 * Get approximate valence/arousal for a mood
 */
function getMoodValenceArousal(mood: MoodCategory): {
  valence: number;
  arousal: number;
} {
  const VA_MAP: Record<MoodCategory, { valence: number; arousal: number }> = {
    calm: { valence: 0.6, arousal: 0.2 },
    serene: { valence: 0.7, arousal: 0.3 },
    hopeful: { valence: 0.8, arousal: 0.4 },
    joyful: { valence: 0.9, arousal: 0.7 },
    energetic: { valence: 0.7, arousal: 0.9 },
    tense: { valence: 0.3, arousal: 0.8 },
    angry: { valence: 0.2, arousal: 0.9 },
    melancholic: { valence: 0.3, arousal: 0.3 },
  };
  return VA_MAP[mood] || { valence: 0.5, arousal: 0.5 };
}

// Singleton provider instance
let emotionProviderInstance: EmotionProvider | null = null;

/**
 * Get emotion provider instance
 */
function getEmotionProvider(): EmotionProvider | null {
  return emotionProviderInstance;
}

/**
 * Set emotion provider instance (called during plugin initialization)
 */
export function setEmotionProvider(provider: EmotionProvider): void {
  emotionProviderInstance = provider;
}
