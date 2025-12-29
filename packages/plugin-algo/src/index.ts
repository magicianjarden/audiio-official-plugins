/**
 * Audiio Algo - Official ML/AI Algorithm Plugin
 *
 * This plugin provides:
 * - Audio feature extraction (Essentia.js)
 * - Emotion/mood detection
 * - Lyrics sentiment analysis
 * - Audio fingerprinting
 * - Track similarity embeddings
 * - Neural network scoring
 * - Radio/playlist generation
 *
 * Third-party developers can create alternative algorithms
 * by implementing the AlgorithmPlugin interface from @audiio/ml-sdk.
 */

// Main algorithm
export { AudiioAlgorithm, RadioGenerator } from './algorithm';
export { AUDIIO_ALGO_MANIFEST } from './manifest';

// Scoring components
export { HybridScorer, NeuralScorer } from './scoring';

// Training
export { Trainer } from './training';

// Feature providers
export {
  EssentiaProvider,
  EmotionProvider,
  LyricsProvider,
  FingerprintProvider,
  EmbeddingProvider,
} from './providers';

// UI Adapter (for integration with existing UI code)
export { createUIPluginAdapter, audiioAlgoUIPlugin } from './adapter';

// Pipeline hooks (for Discover "See All" integration)
export {
  emotionTransformer,
  lyricsTransformer,
  audioFeaturesTransformer,
  sessionFlowTransformer,
  registerAlgoPipelineHooks,
} from './pipeline';

// Re-export types for convenience
export type {
  AlgorithmPlugin,
  AlgorithmManifest,
  AlgorithmCapabilities,
  AlgorithmRequirements,
  AlgorithmSettingDefinition,
  MLCoreEndpoints,
  Track,
  TrackScore,
  ScoringContext,
  AudioFeatures,
  EmotionFeatures,
  LyricsFeatures,
  AggregatedFeatures,
  TrainingDataset,
  TrainingResult,
} from '@audiio/ml-sdk';

import { AUDIIO_ALGO_MANIFEST } from './manifest';

/**
 * Audiio Algorithm Plugin - BaseAddon compatible wrapper
 *
 * This class wraps the algorithm functionality in a format compatible
 * with the Audiio plugin loader. The actual ML functionality is handled
 * by the MLService in the main process, but this registers the plugin
 * in the addon registry for UI visibility.
 */
export class AudiioAlgoPlugin {
  readonly id = 'algo';
  readonly name = 'Audiio Algorithm';

  get manifest() {
    return {
      id: this.id,
      name: this.name,
      version: AUDIIO_ALGO_MANIFEST.version,
      roles: ['audio-processor' as const],
      description: AUDIIO_ALGO_MANIFEST.description,
      author: AUDIIO_ALGO_MANIFEST.author,
      settings: AUDIIO_ALGO_MANIFEST.settings,
    };
  }

  async initialize(): Promise<void> {
    console.log('[AudiioAlgo] Plugin initialized');
    // Actual ML initialization happens in MLService
  }

  async dispose(): Promise<void> {
    console.log('[AudiioAlgo] Plugin disposed');
  }
}

// Default export for plugin loader compatibility
export default AudiioAlgoPlugin;
