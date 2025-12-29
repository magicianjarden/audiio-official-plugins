/**
 * Session Flow Transformer
 *
 * Optimizes track order for smooth energy and mood transitions.
 * Creates a natural flow that avoids jarring changes between tracks.
 */

import type {
  ResultTransformer,
  PipelineContext,
  StructuredSectionQuery,
} from '@audiio/sdk';
import type { UnifiedTrack } from '@audiio/core';
import type { AudioFeatures, EmotionFeatures } from '@audiio/ml-sdk';
import { EssentiaProvider } from '../providers/essentia/essentia-provider';
import { EmotionProvider } from '../providers/emotion/emotion-provider';

const PLUGIN_ID = 'algo';

// Maximum allowed "jump" in energy/arousal between consecutive tracks
const MAX_ENERGY_JUMP = 0.4;
const MAX_AROUSAL_JUMP = 0.35;
const MAX_BPM_JUMP = 30;

interface TrackFeatures {
  track: UnifiedTrack;
  energy: number;
  arousal: number;
  bpm: number;
}

export const sessionFlowTransformer: ResultTransformer = {
  id: `${PLUGIN_ID}:session-flow`,
  pluginId: PLUGIN_ID,
  priority: 50, // Lower priority - runs after other filters
  name: 'Session Flow',
  description: 'Optimizes track order for smooth energy transitions',
  enabledByDefault: true,

  canTransform(query: StructuredSectionQuery): boolean {
    // Apply for embedding-based queries that benefit from flow
    return (
      query.strategy === 'embedding' &&
      query.embedding?.method !== 'similar' // Don't reorder similarity results
    );
  },

  async transform(
    results: UnifiedTrack[],
    context: PipelineContext
  ): Promise<UnifiedTrack[]> {
    // Need at least 3 tracks to optimize flow
    if (results.length < 3) return results;

    // Get providers
    const essentiaProvider = getEssentiaProvider();
    const emotionProvider = getEmotionProvider();

    if (!essentiaProvider && !emotionProvider) return results;

    // Gather features for all tracks
    const tracksWithFeatures: TrackFeatures[] = [];

    for (const track of results) {
      let energy = 0.5;
      let arousal = 0.5;
      let bpm = 120;

      // Get audio features
      if (essentiaProvider) {
        const audio = await essentiaProvider.getAudioFeatures(track.id);
        if (audio) {
          bpm = audio.bpm || 120;
          // Estimate energy from loudness and BPM
          energy = estimateEnergy(audio);
        }
      }

      // Get emotion features
      if (emotionProvider) {
        const emotion = await emotionProvider.getEmotionFeatures(track.id);
        if (emotion) {
          arousal = emotion.arousal;
          // Blend with audio energy
          energy = (energy + emotion.arousal) / 2;
        }
      }

      tracksWithFeatures.push({ track, energy, arousal, bpm });
    }

    // Optimize track order for flow
    const optimized = optimizeFlow(tracksWithFeatures, context);

    return optimized.map((t) => t.track);
  },
};

/**
 * Estimate energy level from audio features
 */
function estimateEnergy(audio: AudioFeatures): number {
  let energy = 0.5;

  // BPM contribution (normalized to 0-1 range, 60-180 BPM)
  const bpm = audio.bpm || 120;
  const bpmNorm = Math.max(0, Math.min(1, (bpm - 60) / 120));
  energy = bpmNorm * 0.4;

  // Loudness contribution (-30 to 0 dB range)
  const loudness = audio.loudness || -15;
  const loudnessNorm = Math.max(0, Math.min(1, (loudness + 30) / 30));
  energy += loudnessNorm * 0.3;

  // Danceability contribution
  if (audio.danceability !== undefined) {
    energy += audio.danceability * 0.3;
  } else {
    energy += 0.15; // Neutral if unknown
  }

  return Math.max(0, Math.min(1, energy));
}

/**
 * Optimize track order for smooth transitions
 */
function optimizeFlow(
  tracks: TrackFeatures[],
  context: PipelineContext
): TrackFeatures[] {
  if (tracks.length <= 2) return tracks;

  // Determine target energy curve based on time of day
  const hour = context.hour;
  const targetCurve = getTargetEnergyCurve(hour, tracks.length);

  // Use greedy algorithm to build optimal sequence
  const result: TrackFeatures[] = [];
  const remaining = [...tracks];

  // Start with track closest to initial target energy
  const firstTarget = targetCurve[0];
  let bestFirst = 0;
  let bestFirstDiff = Infinity;

  for (let i = 0; i < remaining.length; i++) {
    const diff = Math.abs(remaining[i].energy - firstTarget);
    if (diff < bestFirstDiff) {
      bestFirstDiff = diff;
      bestFirst = i;
    }
  }

  result.push(remaining.splice(bestFirst, 1)[0]);

  // Greedily add tracks that minimize transition cost
  while (remaining.length > 0) {
    const last = result[result.length - 1];
    const position = result.length;
    const targetEnergy = targetCurve[Math.min(position, targetCurve.length - 1)];

    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Calculate transition cost
      const energyJump = Math.abs(candidate.energy - last.energy);
      const arousalJump = Math.abs(candidate.arousal - last.arousal);
      const bpmJump = Math.abs(candidate.bpm - last.bpm);

      // Penalize jumps that exceed thresholds
      let penalty = 0;
      if (energyJump > MAX_ENERGY_JUMP) penalty += (energyJump - MAX_ENERGY_JUMP) * 2;
      if (arousalJump > MAX_AROUSAL_JUMP) penalty += (arousalJump - MAX_AROUSAL_JUMP) * 2;
      if (bpmJump > MAX_BPM_JUMP) penalty += (bpmJump - MAX_BPM_JUMP) / 30;

      // Score includes target alignment and transition smoothness
      const targetDiff = Math.abs(candidate.energy - targetEnergy);
      const score = targetDiff * 0.5 + penalty;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0]);
  }

  return result;
}

/**
 * Get target energy curve based on time of day and playlist length
 */
function getTargetEnergyCurve(hour: number, length: number): number[] {
  // Determine base energy level by time of day
  let baseEnergy: number;
  if (hour >= 6 && hour < 10) {
    // Morning: start low, build up
    baseEnergy = 0.4;
  } else if (hour >= 10 && hour < 14) {
    // Late morning/lunch: moderate-high
    baseEnergy = 0.65;
  } else if (hour >= 14 && hour < 18) {
    // Afternoon: moderate
    baseEnergy = 0.55;
  } else if (hour >= 18 && hour < 22) {
    // Evening: moderate-high, then taper
    baseEnergy = 0.6;
  } else {
    // Night: low
    baseEnergy = 0.35;
  }

  // Create curve that peaks in the middle third
  const curve: number[] = [];
  for (let i = 0; i < length; i++) {
    const position = i / (length - 1); // 0 to 1

    // Bell curve peaking at 0.4-0.6 position
    const peakPosition = 0.5;
    const peakWidth = 0.4;
    const bellValue =
      Math.exp(-Math.pow((position - peakPosition) / peakWidth, 2)) * 0.2;

    const energy = baseEnergy + bellValue;
    curve.push(Math.max(0.2, Math.min(0.9, energy)));
  }

  return curve;
}

// Singleton provider instances
let essentiaProviderInstance: EssentiaProvider | null = null;
let emotionProviderInstance: EmotionProvider | null = null;

function getEssentiaProvider(): EssentiaProvider | null {
  return essentiaProviderInstance;
}

function getEmotionProvider(): EmotionProvider | null {
  return emotionProviderInstance;
}

export function setEssentiaProvider(provider: EssentiaProvider): void {
  essentiaProviderInstance = provider;
}

export function setEmotionProvider(provider: EmotionProvider): void {
  emotionProviderInstance = provider;
}
