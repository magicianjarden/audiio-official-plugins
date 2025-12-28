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
export { AudiioAlgorithm, RadioGenerator } from './algorithm';
export { AUDIIO_ALGO_MANIFEST } from './manifest';
export { HybridScorer, NeuralScorer } from './scoring';
export { Trainer } from './training';
export { EssentiaProvider, EmotionProvider, LyricsProvider, FingerprintProvider, EmbeddingProvider, } from './providers';
export { createUIPluginAdapter, audiioAlgoUIPlugin } from './adapter';
export type { AlgorithmPlugin, AlgorithmManifest, AlgorithmCapabilities, AlgorithmRequirements, AlgorithmSettingDefinition, MLCoreEndpoints, Track, TrackScore, ScoringContext, AudioFeatures, EmotionFeatures, LyricsFeatures, AggregatedFeatures, TrainingDataset, TrainingResult, } from '@audiio/ml-sdk';
import { AudiioAlgorithm as _AudiioAlgorithm } from './algorithm';
/**
 * Create and return the Audiio Algorithm instance
 */
export declare function createAudiioAlgorithm(): _AudiioAlgorithm;
/**
 * Plugin metadata for auto-discovery
 */
export declare const plugin: {
    name: string;
    version: string;
    description: string;
    create: typeof createAudiioAlgorithm;
};
export default plugin;
//# sourceMappingURL=index.d.ts.map