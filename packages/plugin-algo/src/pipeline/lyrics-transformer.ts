/**
 * Lyrics Transformer
 *
 * Filters and reorders tracks based on lyrics sentiment analysis.
 * Uses the LyricsProvider to match tracks to requested mood/theme.
 */

import type {
  ResultTransformer,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { LyricsFeatures } from '@audiio/ml-sdk';
import { LyricsProvider } from '../providers/lyrics/lyrics-provider';

const PLUGIN_ID = 'algo';

// Theme to mood mapping
const THEME_MOOD_MAP: Record<string, string[]> = {
  love: ['romantic', 'happy'],
  heartbreak: ['sad', 'melancholic'],
  party: ['energetic', 'happy', 'party'],
  nostalgia: ['chill', 'sad', 'melancholic'],
  empowerment: ['energetic', 'uplifting'],
  nature: ['chill', 'relaxed', 'peaceful'],
  spirituality: ['uplifting', 'peaceful'],
  rebellion: ['angry', 'energetic'],
};

// Mood to expected sentiment range
const MOOD_SENTIMENT_MAP: Record<string, { min: number; max: number }> = {
  happy: { min: 0.3, max: 1.0 },
  sad: { min: -1.0, max: -0.2 },
  energetic: { min: 0.0, max: 1.0 },
  chill: { min: -0.2, max: 0.5 },
  romantic: { min: 0.2, max: 0.8 },
  angry: { min: -1.0, max: -0.3 },
  uplifting: { min: 0.4, max: 1.0 },
  party: { min: 0.2, max: 1.0 },
  melancholic: { min: -0.8, max: 0.0 },
  peaceful: { min: 0.0, max: 0.6 },
  focus: { min: -0.3, max: 0.3 }, // Neutral sentiment for focus
};

export const lyricsTransformer: ResultTransformer = {
  id: `${PLUGIN_ID}:lyrics`,
  pluginId: PLUGIN_ID,
  priority: 75,
  name: 'Lyrics Sentiment',
  description: 'Matches tracks by lyrics sentiment and theme analysis',
  enabledByDefault: true,

  canTransform(query: StructuredSectionQuery): boolean {
    // Apply when there's a mood or when lyrics analysis would help
    return !!(
      query.embedding?.mood ||
      query.embedding?.method === 'mood' ||
      query.sectionType === 'mood' ||
      query.sectionType?.includes('lyrics')
    );
  },

  async transform(
    results: UnifiedTrack[],
    context: PipelineContext
  ): Promise<UnifiedTrack[]> {
    const queryMood = context.query.embedding?.mood?.toLowerCase();
    if (!queryMood) return results;

    // Get lyrics provider instance
    const lyricsProvider = getLyricsProvider();
    if (!lyricsProvider) return results;

    // Get expected sentiment range for this mood
    const sentimentRange = MOOD_SENTIMENT_MAP[queryMood] || { min: -1, max: 1 };

    // Get themes that match this mood
    const matchingThemes = Object.entries(THEME_MOOD_MAP)
      .filter(([, moods]) => moods.includes(queryMood))
      .map(([theme]) => theme);

    // Score each track by lyrics match
    const scored: Array<{ track: UnifiedTrack; score: number }> = [];

    for (const track of results) {
      const lyrics = await lyricsProvider.getLyricsFeatures(track.id);
      if (!lyrics) {
        // No lyrics data - neutral score
        scored.push({ track, score: 0.5 });
        continue;
      }

      // Calculate lyrics match score
      const score = calculateLyricsScore(lyrics, sentimentRange, matchingThemes);
      scored.push({ track, score });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return sorted tracks
    return scored.map((s) => s.track);
  },
};

/**
 * Calculate lyrics match score
 */
function calculateLyricsScore(
  lyrics: LyricsFeatures,
  sentimentRange: { min: number; max: number },
  matchingThemes: string[]
): number {
  let score = 0.5;

  // Sentiment match (0-0.5)
  const sentiment = lyrics.sentiment;
  if (sentiment >= sentimentRange.min && sentiment <= sentimentRange.max) {
    // Within range - good match
    const rangeCenter = (sentimentRange.min + sentimentRange.max) / 2;
    const distanceFromCenter = Math.abs(sentiment - rangeCenter);
    const rangeSize = (sentimentRange.max - sentimentRange.min) / 2;
    score += 0.3 * (1 - distanceFromCenter / rangeSize) * lyrics.sentimentConfidence;
  } else {
    // Outside range - penalty
    const distanceFromRange = Math.min(
      Math.abs(sentiment - sentimentRange.min),
      Math.abs(sentiment - sentimentRange.max)
    );
    score -= Math.min(0.3, distanceFromRange * 0.2);
  }

  // Theme match (0-0.3)
  if (lyrics.themes && lyrics.themes.length > 0) {
    for (const trackTheme of lyrics.themes) {
      if (matchingThemes.includes(trackTheme.theme)) {
        score += 0.15 * trackTheme.confidence;
        break; // Only count one theme match
      }
    }
  }

  // Emotional intensity (0-0.2)
  // High intensity tracks are more impactful for energetic/angry moods
  const intensityMoods = ['energetic', 'angry', 'party', 'uplifting'];
  const wantsIntensity = intensityMoods.some((m) =>
    matchingThemes.some((t) => THEME_MOOD_MAP[t]?.includes(m))
  );

  if (wantsIntensity) {
    score += 0.1 * lyrics.emotionalIntensity;
  } else {
    // For calm moods, lower intensity is better
    score += 0.1 * (1 - lyrics.emotionalIntensity);
  }

  return Math.max(0, Math.min(1, score));
}

// Singleton provider instance
let lyricsProviderInstance: LyricsProvider | null = null;

/**
 * Get lyrics provider instance
 */
function getLyricsProvider(): LyricsProvider | null {
  return lyricsProviderInstance;
}

/**
 * Set lyrics provider instance (called during plugin initialization)
 */
export function setLyricsProvider(provider: LyricsProvider): void {
  lyricsProviderInstance = provider;
}
